import React, { useState, useEffect, useRef } from 'react';
import {
   MapPin,
   Navigation,
   ArrowUpDown,
   Search,
   X,
   Crosshair,
   Map,
   Newspaper,
} from 'lucide-react';
import { VehicleSelector } from './VehicleSelector';
import { TimeSelector } from './TimeSelector';
import { RouteComparisonCard } from './RouteComparisonCard';
import { NewsFeedTab } from '../News/NewsFeedTab';
import {
   navigateRoute,
   searchLocation,
   reverseGeocode,
} from '../../services/api';
import { NavigateResponse } from '../../types';

export interface LocationItem {
   label: string;
   lat: number;
   lng: number;
}

interface RoutePlannerPanelProps {
   origin: LocationItem;
   destination: LocationItem;
   onChangeOrigin: (loc: LocationItem) => void;
   onChangeDestination: (loc: LocationItem) => void;
   onRoutesCalculated: (routes: NavigateResponse) => void;
   selectedRouteType: 'safe' | 'fastest';
   onSelectRouteType: (t: 'safe' | 'fastest') => void;
   pickingField: 'origin' | 'dest' | null;
   onStartPickOnMap: (field: 'origin' | 'dest') => void;
   onCancelPickOnMap: () => void;
   onRefreshFloods?: (targetTime?: string) => void;
   onSelectLocation?: (lat: number, lng: number) => void;
}

export const RoutePlannerPanel: React.FC<RoutePlannerPanelProps> = ({
   origin,
   destination,
   onChangeOrigin,
   onChangeDestination,
   onRoutesCalculated,
   selectedRouteType,
   onSelectRouteType,
   pickingField,
   onStartPickOnMap,
   onCancelPickOnMap,
   onRefreshFloods,
   onSelectLocation,
}) => {
   const [mainTab, setMainTab] = useState<'routes' | 'news'>('routes');
   const [vehicle, setVehicle] = useState<'motorbike' | 'car'>('motorbike');
   const [targetTime, setTargetTime] = useState<string>(() =>
      new Date().toISOString(),
   );
   const [loading, setLoading] = useState(false);
   const [routeData, setRouteData] = useState<NavigateResponse | null>(null);

   // Search autocomplete state
   const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(
      null,
   );
   const [searchQuery, setSearchQuery] = useState('');
   const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
   const [searching, setSearching] = useState(false);
   const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

   // GPS geolocation state
   const [gpsLoading, setGpsLoading] = useState(false);

   useEffect(() => {
      if (activeField) {
         if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
         setSearching(true);
         searchTimeoutRef.current = setTimeout(async () => {
            const results = await searchLocation(searchQuery);
            setSuggestions(results);
            setSearching(false);
         }, 300);
      }
      return () => {
         if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      };
   }, [searchQuery, activeField]);

   const handleSelectLocation = (loc: LocationItem) => {
      if (activeField === 'origin') {
         onChangeOrigin(loc);
      } else if (activeField === 'dest') {
         onChangeDestination(loc);
      }
      setActiveField(null);
      setSearchQuery('');
   };

   const handleGetCurrentLocation = () => {
      if (!navigator.geolocation) {
         alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
         return;
      }

      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
         async (pos) => {
            const { latitude, longitude } = pos.coords;
            const rev = await reverseGeocode(latitude, longitude);
            onChangeOrigin({
               label: rev.label || 'Vị trí hiện tại của tôi',
               lat: latitude,
               lng: longitude,
            });
            setGpsLoading(false);
         },
         (err) => {
            console.warn('GPS location error:', err);
            alert(
               'Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.',
            );
            setGpsLoading(false);
         },
         { enableHighAccuracy: true, timeout: 8000 },
      );
   };

   const handleSwap = () => {
      const temp = { ...origin };
      onChangeOrigin(destination);
      onChangeDestination(temp);
   };

   const handleSearch = async () => {
      setLoading(true);
      try {
         let finalOrigin = { ...origin };
         let finalDest = { ...destination };

         // Fallback geocoding if lat/lng is 0
         if (!finalOrigin.lat) {
            const found = await searchLocation(finalOrigin.label);
            if (found.length > 0) finalOrigin = found[0];
         }
         if (!finalDest.lat) {
            const found = await searchLocation(finalDest.label);
            if (found.length > 0) finalDest = found[0];
         }

         const data = await navigateRoute({
            origin: { lat: finalOrigin.lat, lng: finalOrigin.lng },
            destination: { lat: finalDest.lat, lng: finalDest.lng },
            target_time: targetTime,
            vehicle_type: vehicle,
         });
         setRouteData(data);
         onRoutesCalculated(data);
      } catch (err) {
         console.error('Route calculation failed', err);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="absolute top-4 left-4 z-[1000] w-96 max-h-[92vh] overflow-y-auto bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-3.5">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-2xl">🌊</span>
               <div>
                  <h2 className="font-extrabold text-base text-gray-900 tracking-tight">
                     SafeRoute
                  </h2>
                  <p className="text-[11px] text-gray-500">
                     Định tuyến né ngập thông minh TP.HCM
                  </p>
               </div>
            </div>
         </div>

         {/* Navigation Tab Bar: Lộ Trình vs Tin Tức Ngập Lụt */}
         <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80">
            <button
               type="button"
               onClick={() => setMainTab('routes')}
               className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  mainTab === 'routes'
                     ? 'bg-white text-blue-700 shadow-sm'
                     : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
               }`}
            >
               <Navigation className="w-3.5 h-3.5" />
               Lộ trình né ngập
            </button>
            <button
               type="button"
               onClick={() => setMainTab('news')}
               className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  mainTab === 'news'
                     ? 'bg-white text-indigo-700 shadow-sm'
                     : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
               }`}
            >
               <Newspaper className="w-3.5 h-3.5" />
               Tin tức ngập lụt
            </button>
         </div>

         {mainTab === 'news' ? (
            <NewsFeedTab
               onSelectLocation={onSelectLocation}
               onRefreshFloods={onRefreshFloods}
            />
         ) : (
            <>
         {/* Banner when pick-on-map is active */}
         {pickingField && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 animate-pulse">
               <div className="flex items-center gap-1.5 font-semibold">
                  <Map className="w-4 h-4 text-blue-600" />
                  <span>
                     Click trên bản đồ để chọn{' '}
                     {pickingField === 'origin'
                        ? 'Điểm xuất phát'
                        : 'Điểm đến'}
                  </span>
               </div>
               <button
                  type="button"
                  onClick={onCancelPickOnMap}
                  className="text-[11px] font-bold text-blue-700 hover:underline ml-2"
               >
                  Hủy
               </button>
            </div>
         )}

         {/* Origin & Destination Inputs with Quick Pick buttons */}
         <div className="space-y-2">
            {/* Origin Field */}
            <div className="relative">
               <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                     Điểm xuất phát
                  </span>
                  <div className="flex items-center gap-1">
                     <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={gpsLoading}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition"
                        title="Lấy tọa độ vị trí hiện tại của bạn qua GPS"
                     >
                        <Crosshair className="w-3 h-3" />
                        {gpsLoading ? 'Đang định vị...' : 'Vị trí của tôi'}
                     </button>
                     <button
                        type="button"
                        onClick={() => onStartPickOnMap('origin')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                           pickingField === 'origin'
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                        }`}
                        title="Click trên bản đồ để ghim điểm xuất phát"
                     >
                        <Map className="w-3 h-3" />
                        Ghim trên map
                     </button>
                  </div>
               </div>

               <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-emerald-500 focus-within:bg-white transition">
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <input
                     type="text"
                     value={
                        activeField === 'origin' ? searchQuery : origin.label
                     }
                     onFocus={() => {
                        setActiveField('origin');
                        setSearchQuery(origin.label);
                     }}
                     onBlur={() =>
                        setTimeout(() => {
                           if (activeField === 'origin') setActiveField(null);
                        }, 250)
                     }
                     onChange={(e) => {
                        setSearchQuery(e.target.value);
                        onChangeOrigin({
                           label: e.target.value,
                           lat: 0,
                           lng: 0,
                        });
                     }}
                     placeholder="Nhập địa chỉ nhà, tên đường, quận..."
                     className="text-xs bg-transparent w-full outline-none font-medium text-gray-800 placeholder-gray-400"
                  />
                  {origin.label && (
                     <button
                        type="button"
                        onClick={() => {
                           onChangeOrigin({ label: '', lat: 0, lng: 0 });
                           setSearchQuery('');
                        }}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                     >
                        <X className="w-3.5 h-3.5" />
                     </button>
                  )}
               </div>

               {/* Dropdown Suggestions for Origin */}
               {activeField === 'origin' && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl mt-1.5 max-h-56 overflow-y-auto divide-y divide-gray-100">
                     <div className="p-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <span className="flex items-center gap-1">
                           <Search className="w-3 h-3 text-emerald-600" />
                           Gợi ý điểm xuất phát
                        </span>
                        {searching && (
                           <span className="text-emerald-600 lowercase font-normal">
                              đang tìm...
                           </span>
                        )}
                     </div>
                     {suggestions.length === 0 && !searching && (
                        <div className="p-3 text-xs text-gray-500 text-center">
                           Không tìm thấy địa chỉ. Bạn có thể bấm{' '}
                           <strong className="text-emerald-600">
                              "Ghim trên map"
                           </strong>{' '}
                           hoặc{' '}
                           <strong className="text-emerald-600">
                              "Vị trí của tôi"
                           </strong>{' '}
                           để chọn điểm chuẩn xác.
                        </div>
                     )}
                     {suggestions.map((item, idx) => (
                        <div
                           key={idx}
                           onMouseDown={() => handleSelectLocation(item)}
                           className="p-2.5 text-xs text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition flex items-start gap-2"
                        >
                           <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                           <div className="flex-1">
                              <div className="font-medium text-gray-900 leading-snug">
                                 {item.label}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                 Tọa độ: {item.lat.toFixed(4)},{' '}
                                 {item.lng.toFixed(4)}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>

            {/* Swap button */}
            <div className="flex justify-center -my-1 z-10 relative">
               <button
                  type="button"
                  onClick={handleSwap}
                  title="Đảo ngược điểm đi và điểm đến"
                  className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 rounded-full shadow-sm hover:shadow transition"
               >
                  <ArrowUpDown className="w-3.5 h-3.5" />
               </button>
            </div>

            {/* Destination Field */}
            <div className="relative">
               <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{' '}
                     Điểm đến
                  </span>
                  <button
                     type="button"
                     onClick={() => onStartPickOnMap('dest')}
                     className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                        pickingField === 'dest'
                           ? 'bg-blue-600 text-white'
                           : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                     }`}
                     title="Click trên bản đồ để ghim điểm đến"
                  >
                     <Map className="w-3 h-3" />
                     Ghim trên map
                  </button>
               </div>

               <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition">
                  <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <input
                     type="text"
                     value={
                        activeField === 'dest' ? searchQuery : destination.label
                     }
                     onFocus={() => {
                        setActiveField('dest');
                        setSearchQuery(destination.label);
                     }}
                     onBlur={() =>
                        setTimeout(() => {
                           if (activeField === 'dest') setActiveField(null);
                        }, 250)
                     }
                     onChange={(e) => {
                        setSearchQuery(e.target.value);
                        onChangeDestination({
                           label: e.target.value,
                           lat: 0,
                           lng: 0,
                        });
                     }}
                     placeholder="Nhập số nhà, tên đường, quận..."
                     className="text-xs bg-transparent w-full outline-none font-medium text-gray-800 placeholder-gray-400"
                  />
                  {destination.label && (
                     <button
                        type="button"
                        onClick={() => {
                           onChangeDestination({ label: '', lat: 0, lng: 0 });
                           setSearchQuery('');
                        }}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                     >
                        <X className="w-3.5 h-3.5" />
                     </button>
                  )}
               </div>

               {/* Dropdown Suggestions for Destination */}
               {activeField === 'dest' && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl mt-1.5 max-h-56 overflow-y-auto divide-y divide-gray-100">
                     <div className="p-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <span className="flex items-center gap-1">
                           <Search className="w-3 h-3 text-blue-600" />
                           Gợi ý điểm đến
                        </span>
                        {searching && (
                           <span className="text-blue-600 lowercase font-normal">
                              đang tìm...
                           </span>
                        )}
                     </div>
                     {suggestions.length === 0 && !searching && (
                        <div className="p-3 text-xs text-gray-500 text-center">
                           Không tìm thấy địa chỉ. Bạn có thể bấm{' '}
                           <strong className="text-blue-600">
                              "Ghim trên map"
                           </strong>{' '}
                           để chọn điểm chuẩn xác.
                        </div>
                     )}
                     {suggestions.map((item, idx) => (
                        <div
                           key={idx}
                           onMouseDown={() => handleSelectLocation(item)}
                           className="p-2.5 text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition flex items-start gap-2"
                        >
                           <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                           <div className="flex-1">
                              <div className="font-medium text-gray-900 leading-snug">
                                 {item.label}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                 Tọa độ: {item.lat.toFixed(4)},{' '}
                                 {item.lng.toFixed(4)}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>

            {/* Grab/Shopee-style Doorstep Precision Hint */}
            <div className="bg-sky-50/80 border border-sky-100 rounded-xl p-2 text-[11px] text-sky-800 flex items-start gap-2">
               <span className="text-sm">📍</span>
               <div className="leading-tight">
                  <span className="font-bold">Định vị chuẩn xác cửa nhà:</span>{' '}
                  Bạn có thể{' '}
                  <strong>kéo thả ghim trên bản đồ</strong> để đặt chính xác vị
                  trí.
               </div>
            </div>
         </div>

         <VehicleSelector vehicle={vehicle} onChange={setVehicle} />
         <TimeSelector
            selectedTime={targetTime}
            onChange={(t) => {
               setTargetTime(t);
               if (onRefreshFloods) onRefreshFloods(t);
            }}
         />

         <button
            onClick={handleSearch}
            disabled={loading || !origin.label || !destination.label}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
         >
            {loading ? 'Đang phân tích vùng ngập...' : 'Tìm Lộ Trình Né Ngập'}
         </button>

         {routeData && (
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
               {/* Visual Flood Detection Alert Banner */}
               {routeData.safe_route.isFlooded ? (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs space-y-0.5">
                     <div className="flex items-center gap-1.5 font-bold text-red-900">
                        <span>🚨</span>
                        <span>
                           Lộ trình có đoạn ngập sâu {routeData.safe_route.maxFloodDepthCm} cm, dài {routeData.safe_route.floodedDistanceMeters} m
                        </span>
                     </div>
                     <p className="text-red-700 text-[11px]">
                        Các lối đi quanh khu vực này hiện đều ngập. Chú ý an toàn khi di chuyển.
                     </p>
                  </div>
               ) : routeData.fastest_route.isFlooded ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-0.5">
                     <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <span>⚠️</span>
                        <span>
                           Tuyến nhanh nhất ngập {routeData.fastest_route.maxFloodDepthCm} cm, dài {routeData.fastest_route.floodedDistanceMeters} m
                        </span>
                     </div>
                     <p className="text-emerald-800 font-semibold text-[11px]">
                        Đã chuyển sang tuyến né ngập an toàn.
                     </p>
                  </div>
               ) : null}
               <RouteComparisonCard
                  type="safe"
                  distanceMeters={routeData.safe_route.distanceMeters}
                  durationSeconds={routeData.safe_route.durationSeconds}
                  isFlooded={routeData.safe_route.isFlooded}
                  maxFloodDepthCm={routeData.safe_route.maxFloodDepthCm}
                  floodedDistanceMeters={routeData.safe_route.floodedDistanceMeters}
                  hasAvoidedFlood={routeData.fastest_route.isFlooded && !routeData.safe_route.isFlooded}
                  isSelected={selectedRouteType === 'safe'}
                  onSelect={() => onSelectRouteType('safe')}
               />
               <RouteComparisonCard
                  type="fastest"
                  distanceMeters={routeData.fastest_route.distanceMeters}
                  durationSeconds={routeData.fastest_route.durationSeconds}
                  isFlooded={routeData.fastest_route.isFlooded}
                  maxFloodDepthCm={routeData.fastest_route.maxFloodDepthCm}
                  floodedDistanceMeters={
                     routeData.fastest_route.floodedDistanceMeters
                  }
                  isSelected={selectedRouteType === 'fastest'}
                  onSelect={() => onSelectRouteType('fastest')}
               />
            </div>
         )}
         </>
         )}
      </div>
   );
};

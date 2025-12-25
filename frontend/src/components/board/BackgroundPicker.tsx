import { useState } from 'react';
import { Palette, Image as ImageIcon, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from 'i18next';

interface BackgroundPickerProps {
  currentBackground?: string;
  onSelect: (background: string) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Blue Ocean', value: '#0079bf' },
  { name: 'Orange Sunset', value: '#d29034' },
  { name: 'Forest Green', value: '#519839' },
  { name: 'Red Canyon', value: '#b04632' },
  { name: 'Purple Mountain', value: '#89609e' },
  { name: 'Pink Sky', value: '#cd5a91' },
  { name: 'Meadow Green', value: '#4bbf6b' },
  { name: 'Tropical Cyan', value: '#00aecc' },
  { name: 'Storm Gray', value: '#838c91' },
];

const PRESET_GRADIENTS = [
  { name: 'Purple Dream', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Sunset Vibes', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Ocean Blue', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Fresh Mint', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { name: 'Golden Hour', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Deep Space', value: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
  { name: 'Pastel Dream', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { name: 'Rose Garden', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { name: 'Northern Lights', value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
  { name: 'Autumn Leaves', value: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)' },
];

// Unsplash landscape photos - high quality and free to use
const LANDSCAPE_PHOTOS = [
  { name: 'Mountain Lake', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80' },
  { name: 'Northern Lights', url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1600&q=80' },
  { name: 'Desert Dunes', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1600&q=80' },
  { name: 'Ocean Waves', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600&q=80' },
  { name: 'Forest Path', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80' },
  { name: 'Sunset Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80' },
  { name: 'Snow Mountains', url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1600&q=80' },
  { name: 'Lavender Field', url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1600&q=80' },
  { name: 'Tropical Paradise', url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80' },
  { name: 'Cherry Blossom', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&q=80' },
  { name: 'Autumn Forest', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&q=80' },
  { name: 'Canyon View', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80' },
  { name: 'Starry Night', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600&q=80' },
  { name: 'Rice Terraces', url: 'https://images.unsplash.com/photo-1508805526508-e5ca644e1baf?w=1600&q=80' },
  { name: 'Misty Hills', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80' },
  { name: 'Waterfall', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1600&q=80' },
];

export default function BackgroundPicker({ currentBackground, onSelect, onClose }: BackgroundPickerProps) {
  const [tab, setTab] = useState<'colors' | 'gradients' | 'photos'>('photos');
  const [customUrl, setCustomUrl] = useState('');

  const handleSelectImage = (url: string) => {
    onSelect(`url(${url})`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('background.title')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'photos' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            {t('background.photos')}
          </button>
          <button
            onClick={() => setTab('gradients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'gradients' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Palette className="w-4 h-4" />
            {t('background.gradients')}
          </button>
          <button
            onClick={() => setTab('colors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'colors' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Palette className="w-4 h-4" />
            {t('background.colors')}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[500px] overflow-y-auto">
          {tab === 'photos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {LANDSCAPE_PHOTOS.map((photo) => (
                  <button
                    key={photo.url}
                    onClick={() => handleSelectImage(photo.url)}
                    className="group relative h-24 rounded-lg overflow-hidden hover:scale-105 transition-transform shadow-md hover:shadow-xl"
                  >
                    <img 
                      src={photo.url} 
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {photo.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {t('background.customUrl')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={() => {
                      if (customUrl.trim()) {
                        handleSelectImage(customUrl.trim());
                        setCustomUrl('');
                      }
                    }}
                    size="sm"
                    disabled={!customUrl.trim()}
                  >
                    {t('background.applyBackground')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('background.findPic')} <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Unsplash.com</a>
                </p>
              </div>
            </div>
          )}

          {tab === 'gradients' && (
            <div className="grid grid-cols-2 gap-3">
              {PRESET_GRADIENTS.map((gradient) => (
                <button
                  key={gradient.value}
                  onClick={() => onSelect(gradient.value)}
                  className="relative h-24 rounded-lg hover:scale-105 transition-transform shadow-md hover:shadow-xl overflow-hidden group"
                  style={{ background: gradient.value }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {gradient.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === 'colors' && (
            <div className="grid grid-cols-3 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onSelect(color.value)}
                  className="relative h-20 rounded-lg hover:scale-105 transition-transform shadow-md hover:shadow-xl overflow-hidden group"
                  style={{ backgroundColor: color.value }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                      {color.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {currentBackground && <span>{t('background.currentBackground')}</span>}
          </div>
          <div className="flex gap-2">
            {currentBackground && (
              <Button
                variant="outline"
                onClick={() => onSelect('')}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {t('background.removeBackground')}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              {t('background.done')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

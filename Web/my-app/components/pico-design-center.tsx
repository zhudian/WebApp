'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, ImageIcon, Wand2 } from 'lucide-react'
import Image from "next/image"

interface ReferenceImage {
  id: string;
  src: string;
  position: { x: number; y: number };
  isSelected: boolean;
  scale: {
    width: number;
    height: number;
  };
  width: number;
  height: number;
}

export default function PicoDesignCenter() {
  const [selectedStyle, setSelectedStyle] = useState("1")
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("16:9")
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [imageSize, setImageSize] = useState({ width: 1024, height: 576 })
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState({ width: 400, height: 200 });
  const [isBackgroundSelected, setIsBackgroundSelected] = useState(false);
  const [backgroundPosition, setBackgroundPosition] = useState({ x: 0, y: 0 });
  const [backgroundScale, setBackgroundScale] = useState({ width: 1, height: 1 });
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);

  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const referenceInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'background' | 'reference') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = document.createElement('img');
        img.onload = () => {
          if (img.width > 2048 || img.height > 2048) {
            alert('图片尺寸不能超过2048，请先修改图片尺寸');
            return;
          }

          if (type === 'background') {
            setBackgroundImage(reader.result as string);
            setOriginalImageSize({
              width: img.width,
              height: img.height
            });
          } else {
            setReferenceImages(prev => [...prev, {
              id: Date.now().toString(),
              src: reader.result as string,
              position: { x: 0, y: 0 },
              isSelected: false,
              scale: {
                width: 1,
                height: 1
              },
              width: img.width,
              height: img.height
            }]);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleBackgroundImageMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedImageId('background');
    setIsBackgroundSelected(true);
    setReferenceImages(prev => prev.map(img => ({
      ...img,
      isSelected: false
    })));
    
    setDragStart({
      x: e.clientX - backgroundPosition.x,
      y: e.clientY - backgroundPosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      if (draggedImageId === 'background') {
        setBackgroundPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      } else if (draggedImageId) {
        setReferenceImages(prev => prev.map(img => 
          img.id === draggedImageId
            ? {
                ...img,
                position: {
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y
                }
              }
            : img
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedImageId(null);
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const currentTime = new Date().getTime();
      if (currentTime - lastClickTime < 300) {
        return;
      }
      setLastClickTime(currentTime);

      setIsBackgroundSelected(false);
      setReferenceImages(prev => prev.map(img => ({
        ...img,
        isSelected: false
      })));
      setIsDragging(false);
      setDraggedImageId(null);
    }
  };

  const handleBackgroundImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBackgroundSelected(true);
    setReferenceImages(prev => prev.map(img => ({
      ...img,
      isSelected: false
    })));
  };

  const handleScaleChange = (value: number, type: 'width' | 'height' | 'proportional') => {
    if (isBackgroundSelected) {
      if (type === 'proportional') {
        setBackgroundScale({
          width: value,
          height: value
        });
      } else {
        setBackgroundScale(prev => ({
          ...prev,
          [type]: value
        }));
      }
      return;
    }

    setReferenceImages(prev => prev.map(img => {
      if (!img.isSelected) return img;

      if (type === 'proportional') {
        return {
          ...img,
          scale: {
            width: value,
            height: value
          }
        };
      }

      return {
        ...img,
        scale: {
          ...img.scale,
          [type]: value
        }
      };
    }));
  };

  const handleGenerate = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.src = src;
      });
    };

    try {
      if (backgroundImage) {
        const bgImg = await loadImage(backgroundImage);
        ctx.save();
        ctx.translate(backgroundPosition.x, backgroundPosition.y);
        ctx.scale(backgroundScale.width, backgroundScale.height);
        ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height);
        ctx.restore();
      }

      for (const img of referenceImages) {
        const imgObj = await loadImage(img.src);
        ctx.save();
        ctx.translate(img.position.x, img.position.y);
        ctx.scale(img.scale.width, img.scale.height);
        ctx.drawImage(imgObj, 0, 0, imgObj.width, imgObj.height);
        ctx.restore();
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'generated-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
      console.log('Backspace pressed, isBackgroundSelected:', isBackgroundSelected);
      if (isBackgroundSelected) {
        console.log('Deleting background image');
        setBackgroundImage(null);
        setIsBackgroundSelected(false);
        setBackgroundPosition({ x: 0, y: 0 });
        setBackgroundScale({ width: 1, height: 1 });
        setOriginalImageSize({ width: 400, height: 200 });
      } else {
        console.log('Deleting reference image');
        setReferenceImages(prev => prev.filter(img => !img.isSelected));
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, imageId: string) => {
    setIsDragging(true);
    setDraggedImageId(imageId);
    
    setReferenceImages(prev => prev.map(img => ({
      ...img,
      isSelected: img.id === imageId
    })));
    
    // 取消背景图片的选中
    setIsBackgroundSelected(false);

    const image = referenceImages.find(img => img.id === imageId);
    if (image) {
      setDragStart({
        x: e.clientX - image.position.x,
        y: e.clientY - image.position.y
      });
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBackgroundSelected]);

  // 修改尺寸计算函数
  const getImageSizeByAspectRatio = (ratio: string) => {
    switch (ratio) {
      case '1:1':
        return { width: 1024, height: 1024 };
      case '4:3':
        return { width: 1024, height: 768 };
      case '16:9':
        return { width: 1024, height: 576 };
      case '2:1':
        return { width: 1024, height: 512 };
      case '9:16':
        return { width: 576, height: 1024 };
      default:
        return { width: 1024, height: 576 }; // 默认 16:9
    }
  };

  // 修改 Aspect Ratio 的选择处理函数
  const handleAspectRatioChange = (ratio: string) => {
    setSelectedAspectRatio(ratio);
    const newSize = getImageSizeByAspectRatio(ratio);
    setImageSize(newSize);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">PICO Design Center</h1>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-4">
        {/* Left Sidebar */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="space-y-6 p-4">
            <div className="space-y-2">
              <label className="text-sm flex items-center gap-2 text-gray-400">
                <span>Input prompt</span>
              </label>
              <Textarea 
                placeholder="Describe a picture..."
                className="bg-zinc-800 border-zinc-700 text-gray-300 placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm flex items-center gap-2 text-gray-400">
                <ImageIcon className="w-4 h-4" />
                <span className="text-gray-400">Background</span>
              </label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={backgroundInputRef}
                onChange={(e) => handleImageUpload(e, 'background')}
              />
              <Button 
                variant="outline" 
                className="w-full bg-zinc-800 border-zinc-700 text-gray-400"
                onClick={() => backgroundInputRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Upload Background
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm flex items-center gap-2 text-gray-400">
                <ImageIcon className="w-4 h-4" />
                <span className="text-gray-400">Reference</span>
              </label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={referenceInputRef}
                onChange={(e) => handleImageUpload(e, 'reference')}
              />
              <Button 
                variant="outline" 
                className="w-full bg-zinc-800 border-zinc-700 text-gray-400"
                onClick={() => referenceInputRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Upload Reference
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm flex items-center gap-2 text-gray-400">
                  <span>Width Scaling</span>
                </label>
                <Slider 
                  min={0.05}
                  max={10}
                  step={0.01}
                  defaultValue={[1]}
                  value={[isBackgroundSelected 
                    ? backgroundScale.width 
                    : (referenceImages.find(img => img.isSelected)?.scale.width || 1)
                  ]}
                  onValueChange={([value]) => handleScaleChange(value, 'width')}
                  className="[&_[role=slider]]:bg-gray-300 [&_[data-orientation=horizontal]]:bg-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm flex items-center gap-2 text-gray-400">
                  <span>Height Scaling</span>
                </label>
                <Slider 
                  min={0.05}
                  max={10}
                  step={0.01}
                  defaultValue={[1]}
                  value={[isBackgroundSelected 
                    ? backgroundScale.height 
                    : (referenceImages.find(img => img.isSelected)?.scale.height || 1)
                  ]}
                  onValueChange={([value]) => handleScaleChange(value, 'height')}
                  className="[&_[role=slider]]:bg-gray-300 [&_[data-orientation=horizontal]]:bg-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm flex items-center gap-2 text-gray-400">
                  <span>Proportional Scaling</span>
                </label>
                <Slider 
                  min={0.05}
                  max={10}
                  step={0.01}
                  defaultValue={[1]}
                  value={[isBackgroundSelected 
                    ? backgroundScale.width 
                    : (referenceImages.find(img => img.isSelected)?.scale.width || 1)
                  ]}
                  onValueChange={([value]) => handleScaleChange(value, 'proportional')}
                  className="[&_[role=slider]]:bg-gray-300 [&_[data-orientation=horizontal]]:bg-gray-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm flex items-center gap-2 text-gray-400">
                <ImageIcon className="w-4 h-4" />
                <span className="text-gray-400">Style Selection</span>
              </label>
              <RadioGroup 
                value={selectedStyle} 
                onValueChange={setSelectedStyle}
                className="flex gap-2"
              >
                {['1', '2', '3', '4'].map((style) => (
                  <div key={style} className="relative">
                    <RadioGroupItem
                      value={style}
                      id={`style-${style}`}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`style-${style}`}
                      className={`w-[80px] h-[80px] rounded-lg bg-zinc-800 border-2 block cursor-pointer transition-all ${
                        selectedStyle === style ? 'border-white' : 'border-zinc-700'
                      } overflow-hidden`}
                    >
                      <div className="relative w-full h-full">
                        <Image
                          src={`/placeholder.svg?text=S${style}`}
                          alt={`Style ${style}`}
                          layout="fill"
                          objectFit="cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-white text-xs">S{style}</span>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Aspect Ratio</label>
              <RadioGroup 
                value={selectedAspectRatio} 
                onValueChange={handleAspectRatioChange}
                className="flex flex-wrap gap-2"
              >
                {['1:1', '4:3', '16:9', '2:1', '9:16'].map((ratio) => (
                  <div key={ratio} className="relative">
                    <RadioGroupItem
                      value={ratio}
                      id={`ratio-${ratio}`}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`ratio-${ratio}`}
                      className={`px-2 py-1 rounded-md bg-zinc-800 border-2 block cursor-pointer transition-all w-16 text-center text-gray-400 ${
                        selectedAspectRatio === ratio ? 'border-white' : 'border-zinc-700'
                      }`}
                    >
                      {ratio}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <label className="text-sm flex items-center gap-2 text-gray-400">
                <span>Enter the main text</span>
              </label>
              <Input 
                placeholder="Please write the main title..."
                className="bg-zinc-800 border-zinc-700 text-gray-300 placeholder:text-gray-500"
              />
            </div>

            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              size="lg"
              onClick={handleGenerate}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Image Editing Panel */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4" />
                <span className="text-gray-400 text-sm">Image Editing</span>
              </div>
              <div 
                className="bg-zinc-800 rounded-lg overflow-hidden relative select-none"
                style={{
                  width: `${imageSize.width}px`,
                  height: `${imageSize.height}px`,
                }}
                onClick={handleBackgroundClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Background Image */}
                {backgroundImage && (
                  <div
                    className="absolute cursor-move"
                    style={{
                      transform: `translate(${backgroundPosition.x}px, ${backgroundPosition.y}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: `${originalImageSize.width}px`,
                        height: `${originalImageSize.height}px`,
                        transform: `scale(${backgroundScale.width}, ${backgroundScale.height})`,
                        transformOrigin: 'top left',
                        outline: isBackgroundSelected ? '2px solid blue' : 'none',
                      }}
                      onMouseDown={handleBackgroundImageMouseDown}
                    >
                      <Image
                        src={backgroundImage}
                        alt="Background"
                        width={originalImageSize.width}
                        height={originalImageSize.height}
                        className="object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
                
                {/* Reference Images */}
                {referenceImages.map((refImage) => (
                  <div
                    key={refImage.id}
                    className="absolute cursor-move"
                    style={{
                      transform: `translate(${refImage.position.x}px, ${refImage.position.y}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: `${refImage.width}px`,
                        height: `${refImage.height}px`,
                        transform: `scale(${refImage.scale.width}, ${refImage.scale.height})`,
                        transformOrigin: 'top left',
                        outline: refImage.isSelected ? '2px solid green' : 'none',
                      }}
                      onMouseDown={(e) => handleMouseDown(e, refImage.id)}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <Image
                        src={refImage.src}
                        alt="Reference"
                        width={refImage.width}
                        height={refImage.height}
                        className="object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Default Placeholder */}
                {!backgroundImage && referenceImages.length === 0 && (
                  <Image
                    src="/placeholder.svg?height=576&width=1024"
                    alt="Preview"
                    width={1024}
                    height={576}
                    className="object-contain"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4" />
                <span className="text-gray-400 text-sm">Output</span>
              </div>
              <div 
                className="bg-zinc-800 rounded-lg overflow-hidden relative"
                style={{
                  width: `${imageSize.width}px`,
                  height: `${imageSize.height}px`,
                }}
              >
                <Image
                  src={outputImage || "/placeholder.svg?height=576&width=1024"}
                  alt="Output Image"
                  width={imageSize.width}
                  height={imageSize.height}
                  className="object-contain"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


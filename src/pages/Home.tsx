import { Upload, FileText, Globe, CheckCircle, Mic, Download, ArrowRight, Trash2, Image as ImageIcon, Loader2, Camera, PenTool, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

type InputMethod = 'upload' | 'camera' | 'draw' | null;

interface OCRResult {
  text: string;
  overallConfidence: number;
  words: { word: string; confidence: number }[];
}

export default function Home() {
  const [inputMethod, setInputMethod] = useState<InputMethod>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('English');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'edit' | 'insights'>('insights');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (inputMethod === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [inputMethod]);

  useEffect(() => {
    if (inputMethod === 'draw' && drawCanvasRef.current) {
      const canvas = drawCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'black';
      }
    }
  }, [inputMethod]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure permissions are granted.');
      setInputMethod(null);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureCamera = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelectedImage(dataUrl);
        setInputMethod(null);
        stopCamera();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setInputMethod(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearDrawing = () => {
    if (drawCanvasRef.current) {
      const canvas = drawCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const captureDrawing = () => {
    if (drawCanvasRef.current) {
      const dataUrl = drawCanvasRef.current.toDataURL('image/jpeg');
      setSelectedImage(dataUrl);
      setInputMethod(null);
    }
  };

  const handleRemove = () => {
    setSelectedImage(null);
    setOcrResult(null);
    setEditedText('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processImage = async () => {
    if (!selectedImage) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Extract base64 data
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `You are an expert OCR model. Extract the handwritten text from the image. The expected language is ${language}. 
            Provide the overall confidence score (0-100) and a list of words with their individual confidence scores (0-100).
            If a word is hard to read or ambiguous, give it a lower confidence score (< 80).
            Return the exact text as it appears.`
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: 'The full extracted text' },
              overallConfidence: { type: Type.NUMBER, description: 'Overall confidence score from 0 to 100' },
              words: {
                type: Type.ARRAY,
                description: 'List of extracted words with their confidence scores',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    confidence: { type: Type.NUMBER, description: 'Confidence score from 0 to 100' }
                  }
                }
              }
            },
            required: ['text', 'overallConfidence', 'words']
          }
        }
      });

      const resultText = response.text;
      if (resultText) {
        const parsedResult = JSON.parse(resultText) as OCRResult;
        setOcrResult(parsedResult);
        setEditedText(parsedResult.text);
        setViewMode('insights');
      } else {
        throw new Error("No response from AI");
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const features = [
    {
      name: 'Real-Time Recognition',
      description: 'Instantly convert handwritten notes into editable text.',
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      name: 'Multi-Language Support',
      description: 'Supports multiple languages with high accuracy.',
      icon: Globe,
      color: 'bg-emerald-500',
    },
    {
      name: 'Accuracy Insights',
      description: 'See confidence levels and suggestions for corrections.',
      icon: CheckCircle,
      color: 'bg-indigo-500',
    },
    {
      name: 'Voice Explanation',
      description: 'Audio feedback helps you understand corrections clearly.',
      icon: Mic,
      color: 'bg-purple-500',
    },
    {
      name: 'Easy Export',
      description: 'Save your text as DOCX, PDF, or plain text files.',
      icon: Download,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white pt-16 pb-20">
        <div className="absolute inset-y-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              Turn Your Handwriting into <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Digital Text Instantly!
              </span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 mb-10">
              Using OCR + AI for Image, PDF, Camera, and Drawing Recognition
            </p>
            
            {!selectedImage && !inputMethod && (
              <div className="flex flex-wrap justify-center gap-4">
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-lg shadow-indigo-200"
                >
                  <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
                  Upload Image/PDF
                </button>
                <button 
                  onClick={() => setInputMethod('camera')}
                  className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-indigo-700 transition-all duration-200 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Camera size={20} className="group-hover:scale-110 transition-transform" />
                  Take Photo
                </button>
                <button 
                  onClick={() => setInputMethod('draw')}
                  className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-indigo-700 transition-all duration-200 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PenTool size={20} className="group-hover:rotate-12 transition-transform" />
                  Draw
                </button>
              </div>
            )}

            {/* Camera Input */}
            {inputMethod === 'camera' && (
              <div className="max-w-2xl mx-auto bg-black rounded-2xl overflow-hidden relative shadow-2xl">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4">
                  <button 
                    onClick={() => setInputMethod(null)}
                    className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={captureCamera}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Camera size={18} /> Capture
                  </button>
                </div>
              </div>
            )}

            {/* Draw Input */}
            {inputMethod === 'draw' && (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Draw your text below</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={clearDrawing}
                      className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => setInputMethod(null)}
                      className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <canvas 
                  ref={drawCanvasRef} 
                  width={600} 
                  height={300} 
                  className="w-full h-[300px] cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                />
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                  <button 
                    onClick={captureDrawing}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <CheckCircle size={18} /> Done Drawing
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Workspace Section */}
      {selectedImage && (
        <div className="pb-20 bg-white relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-900">Recognition Workspace</h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <Globe size={16} className="text-slate-500" />
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={processImage}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Recognize Text
                  </button>

                  <button 
                    onClick={handleRemove}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                    Clear
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image Preview */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ImageIcon size={16} /> Original Input
                  </h3>
                  <div className="flex-1 bg-slate-200 rounded-2xl overflow-hidden border border-slate-300 flex items-center justify-center min-h-[300px]">
                    <img 
                      src={selectedImage} 
                      alt="Uploaded handwriting" 
                      className="max-w-full max-h-[500px] object-contain"
                    />
                  </div>
                </div>

                {/* Text Output */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} /> Output
                    </h3>
                    
                    {ocrResult && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <span className="text-slate-500">Confidence:</span>
                          <span className={`${ocrResult.overallConfidence > 85 ? 'text-emerald-600' : ocrResult.overallConfidence > 60 ? 'text-orange-500' : 'text-red-500'}`}>
                            {ocrResult.overallConfidence.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex bg-slate-200 rounded-lg p-1">
                          <button 
                            onClick={() => setViewMode('insights')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'insights' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Insights
                          </button>
                          <button 
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-white rounded-2xl border border-slate-300 overflow-hidden relative min-h-[300px]">
                    {isProcessing ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                        <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
                        <p className="text-indigo-900 font-medium animate-pulse">Analyzing handwriting...</p>
                      </div>
                    ) : !ocrResult ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>Click "Recognize Text" to process the input.</p>
                      </div>
                    ) : viewMode === 'edit' ? (
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full h-full min-h-[300px] p-6 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 leading-relaxed"
                        placeholder="Recognized text will appear here..."
                      />
                    ) : (
                      <div className="w-full h-full min-h-[300px] p-6 overflow-y-auto text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {ocrResult.words.map((wordObj, i) => (
                          <span 
                            key={i} 
                            className={`mr-1 inline-block ${
                              wordObj.confidence < 80 
                                ? 'bg-red-100 text-red-800 border-b-2 border-red-400 cursor-help' 
                                : wordObj.confidence < 90
                                ? 'bg-orange-50 text-orange-800 border-b border-orange-300 cursor-help'
                                : ''
                            }`}
                            title={`Confidence: ${wordObj.confidence}%`}
                          >
                            {wordObj.word}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Key Features Section */}
      <div className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Key Features</h2>
            <p className="mt-4 text-lg text-slate-600">Everything you need to digitize your notes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex items-center justify-center p-3 rounded-xl ${feature.color} text-white mb-6 shadow-sm`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.name}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// Need to import Sparkles
import { Sparkles } from 'lucide-react';

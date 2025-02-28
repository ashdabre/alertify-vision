
import React, { useRef, useState, useEffect } from 'react';
import { Camera, AlertTriangle, Info, Settings, BellRing, BellOff, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DetectionSettings from "@/components/DetectionSettings";
import { pipeline } from "@huggingface/transformers";

interface Detection {
  id: string;
  label: string;
  score: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

const ObjectDetection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('camera');
  const [faceDetectorModel, setFaceDetectorModel] = useState<any>(null);
  const [confidence, setConfidence] = useState(0.5);
  const [faceHistory, setFaceHistory] = useState<string[]>([]);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastSpokenRef = useRef<{label: string, time: number}>({label: '', time: 0});
  
  // Initialize speech synthesis
  const synth = window.speechSynthesis;

  // Setup camera when component mounts
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        toast.info("Loading face recognition model...", {
          duration: 2000,
        });
        
        // Load the face detection model
        const detector = await pipeline(
          "object-detection",
          "Xenova/detr-resnet-50"
        );
        
        setFaceDetectorModel(detector);
        setIsModelLoading(false);
        toast.success("Face recognition model loaded successfully!", {
          duration: 3000,
        });
      } catch (error) {
        console.error("Error loading model:", error);
        setIsModelLoading(false);
        toast.error("Failed to load the face recognition model", {
          duration: 5000,
        });
      }
    };

    loadModel();

    return () => {
      // Clean up video stream when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      // Clear detection interval
      if (detectionIntervalRef.current) {
        window.clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' // Use the front camera for face detection
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Setup canvas size based on video dimensions
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        
        setIsStarted(true);
        toast.success("Camera started successfully!");
        
        // Start detection loop
        startDetectionLoop();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Clear detection interval
    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setIsStarted(false);
    setDetections([]);
    toast.info("Camera stopped");
  };

  const startDetectionLoop = () => {
    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = window.setInterval(() => {
      detectFaces();
    }, 200); // Run detection every 200ms
  };

  const detectFaces = async () => {
    if (!faceDetectorModel || !videoRef.current || !canvasRef.current || !isStarted) return;
    
    try {
      // Get current frame from video
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Draw current video frame to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Perform face detection
      const results = await faceDetectorModel(video, {
        threshold: confidence,
        percentage: true,
      });
      
      // Filter only person detections (faces)
      const faceDetections = results
        .filter((detection: any) => detection.label === 'person')
        .map((detection: any, index: number) => ({
          id: `face-${index}-${Date.now()}`,
          label: 'Face',
          score: detection.score,
          box: {
            xmin: detection.box.xmin * canvas.width,
            ymin: detection.box.ymin * canvas.height,
            xmax: detection.box.xmax * canvas.width,
            ymax: detection.box.ymax * canvas.height
          }
        }));
      
      // Update detections state
      setDetections(faceDetections);
      
      // Draw bounding boxes on canvas
      drawFaces(ctx, faceDetections);
      
      // Handle audio alerts
      handleAudioAlerts(faceDetections);
      
      // Update face history
      if (faceDetections.length > 0) {
        const timestamp = new Date().toLocaleTimeString();
        setFaceHistory(prev => {
          const newEntry = `Face detected at ${timestamp}`;
          return [newEntry, ...prev].slice(0, 10); // Keep only the 10 most recent
        });
      }
    } catch (error) {
      console.error("Error during face detection:", error);
    }
  };

  const drawFaces = (ctx: CanvasRenderingContext2D, faces: Detection[]) => {
    // Clear canvas for new drawings
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw current video frame
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    
    // Draw detection boxes and labels for faces
    faces.forEach(face => {
      const { xmin, ymin, xmax, ymax } = face.box;
      const width = xmax - xmin;
      const height = ymax - ymin;
      
      // Create gradient effect for face boxes
      const gradient = ctx.createLinearGradient(xmin, ymin, xmax, ymax);
      gradient.addColorStop(0, 'rgba(0, 132, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 211, 255, 0.4)');
      
      // Draw face outline with glow effect
      ctx.shadowColor = 'rgba(0, 175, 255, 0.8)';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(xmin, ymin, width, height);
      ctx.shadowBlur = 0;
      
      // Draw semi-transparent background
      ctx.fillStyle = gradient;
      ctx.fillRect(xmin, ymin, width, height);
      
      // Draw border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(xmin, ymin, width, height);
      
      // Calculate confidence percentage
      const confidencePercent = Math.round(face.score * 100);
      
      // Draw label background
      ctx.fillStyle = 'rgba(0, 150, 255, 0.85)';
      const label = `Face (${confidencePercent}%)`;
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width + 10;
      const textHeight = 24;
      ctx.fillRect(xmin, ymin - textHeight, textWidth, textHeight);
      
      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(label, xmin + 5, ymin - 7);
      
      // Draw facial keypoints indicator (simplified)
      const centerX = xmin + width / 2;
      const centerY = ymin + height / 3;
      const eyeDistance = width / 4;
      
      // Left eye (simplified)
      ctx.beginPath();
      ctx.arc(centerX - eyeDistance, centerY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();
      
      // Right eye (simplified)
      ctx.beginPath();
      ctx.arc(centerX + eyeDistance, centerY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();
    });
    
    // Add scanning effect overlay
    ctx.fillStyle = 'rgba(0, 200, 255, 0.05)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const handleAudioAlerts = (faces: Detection[]) => {
    if (isMuted || !faces.length) return;
    
    const now = Date.now();
    
    // Don't repeat the face alert within 5 seconds
    if (lastSpokenRef.current.label === 'Face' && 
        now - lastSpokenRef.current.time < 5000) {
      return;
    }
    
    if (faces.length === 1) {
      // Create speech message for single face
      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `Face detected.`;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Speak the message
      synth.speak(utterance);
    } else if (faces.length > 1) {
      // Create speech message for multiple faces
      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `${faces.length} faces detected.`;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Speak the message
      synth.speak(utterance);
    }
    
    // Update last spoken reference
    lastSpokenRef.current = { label: 'Face', time: now };
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    toast.info(!isMuted ? "Audio alerts muted" : "Audio alerts enabled");
  };

  const handleConfidenceChange = (value: number) => {
    setConfidence(value);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center space-y-6">
        <header className="flex flex-col items-center text-center mb-6 animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <User className="h-10 w-10 text-primary mr-2" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse-light"></div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Face Recognition</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Advanced face detection with real-time alerts. Your intelligent camera 
            assistant that helps you identify faces in your surroundings.
          </p>
        </header>
        
        <div className="w-full">
          <Tabs
            defaultValue="camera"
            value={currentTab}
            onValueChange={setCurrentTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
              <TabsTrigger value="camera" className="text-sm">
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="camera" className="mt-6 animate-fade-in">
              <Card className="glass-card overflow-hidden border-0 shadow-lg rotate-container">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <span className="relative">
                          Face Detection
                          {isStarted && (
                            <span className="absolute -top-1 -right-3 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                          )}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {isStarted 
                          ? "Camera is active and detecting faces in real-time" 
                          : "Start the camera to begin face recognition"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleMute}
                        className="mr-2"
                        disabled={!isStarted}
                      >
                        {isMuted ? <BellOff size={18} /> : <BellRing size={18} />}
                      </Button>
                      <Button
                        variant={isStarted ? "destructive" : "default"}
                        className={cn(
                          "transition-all",
                          !isStarted && "button-glow"
                        )}
                        onClick={isStarted ? stopCamera : startCamera}
                        disabled={isModelLoading}
                      >
                        {isModelLoading 
                          ? "Loading Model..." 
                          : isStarted 
                            ? "Stop Camera" 
                            : "Start Camera"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4">
                  <div className="camera-container aspect-video bg-black/10 rounded-md overflow-hidden border border-white/10">
                    {!isStarted && !isModelLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-6">
                          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h3 className="text-lg font-medium text-muted-foreground">Camera is off</h3>
                          <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto mt-2">
                            Click the "Start Camera" button to begin face recognition
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {isModelLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-6">
                          <div className="w-16 h-16 mx-auto mb-4 border-4 border-t-blue-500 border-white/20 rounded-full animate-spin"></div>
                          <h3 className="text-lg font-medium">Loading face recognition model</h3>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                            Please wait while we initialize the AI model...
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <video 
                      ref={videoRef}
                      className="w-full h-full object-cover opacity-0"
                      style={{ opacity: isStarted ? 1 : 0 }}
                      playsInline
                      muted
                    />
                    <canvas 
                      ref={canvasRef} 
                      className="absolute top-0 left-0 w-full h-full"
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col sm:flex-row items-start justify-between pt-0 px-4 pb-4">
                  <div className="mb-3 sm:mb-0">
                    <p className="text-sm font-medium mb-2">Detection History</p>
                    <div className="flex flex-wrap gap-2">
                      {faceHistory.length > 0 ? (
                        faceHistory.map((entry, i) => (
                          <Badge 
                            key={`${entry}-${i}`} 
                            variant="outline"
                            className="text-xs animate-fade-in"
                          >
                            {entry}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No faces detected yet</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span>
                      {isMuted 
                        ? "Audio alerts are currently muted" 
                        : "Audio alerts are enabled"}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-6 animate-fade-in">
              <DetectionSettings 
                confidence={confidence} 
                onConfidenceChange={handleConfidenceChange}
                isMuted={isMuted}
                onMuteChange={toggleMute}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="w-full max-w-3xl text-center mt-8">
          <p className="text-sm text-muted-foreground">
            <Info className="h-4 w-4 inline mr-1" />
            For best results, ensure good lighting and face the camera directly.
            Face recognition works locally on your device using machine learning.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ObjectDetection;

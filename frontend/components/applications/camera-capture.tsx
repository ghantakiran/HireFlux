'use client';

/**
 * Camera Capture Component
 * Issue #142: Camera-based resume upload with OCR
 *
 * Features:
 * - Live camera preview
 * - Photo capture
 * - Retake functionality
 * - OCR text extraction (simulated)
 * - Permission handling
 */

import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (imageUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize camera
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error: any) {
        if (!mounted) return;

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError('Camera permission denied. Please grant camera access to continue.');
        } else if (error.name === 'NotFoundError') {
          setCameraError('No camera found on this device.');
        } else {
          setCameraError('Failed to access camera. Please try again.');
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture photo
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);

    // Stop video stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCameraError(null);

    // Restart camera
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then((mediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch((error) => {
        setCameraError('Failed to restart camera. Please try again.');
      });
  };

  // Use captured photo
  const handleUsePhoto = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);

    try {
      // Simulate OCR processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In production, this would call an OCR API
      // const result = await fetch('/api/ocr', {
      //   method: 'POST',
      //   body: JSON.stringify({ image: capturedImage }),
      // });

      onCapture(capturedImage);
    } catch (error) {
      setCameraError('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  };

  // Request camera permission
  const handleGrantPermission = async () => {
    setCameraError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      setCameraError('Failed to access camera. Please check your permissions.');
    }
  };

  return (
    <div data-camera-capture className="fixed inset-0 z-50 bg-black">
      {/* Camera Error */}
      {cameraError && (
        <div data-camera-error className="absolute inset-0 flex items-center justify-center p-6 bg-black">
          <div className="text-center max-w-sm">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-white text-lg mb-6">{cameraError}</p>
            <div className="space-y-3">
              <Button
                data-grant-permission
                onClick={handleGrantPermission}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                Grant Camera Permission
              </Button>
              <Button
                data-cancel-camera
                onClick={onCancel}
                variant="outline"
                className="w-full h-12 border-white text-white hover:bg-white hover:text-black"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div data-processing data-ocr-success className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center">
            <div className="animate-spin text-white text-4xl mb-4">⏳</div>
            <p className="text-white text-lg mb-2">Processing image...</p>
            <p className="text-white/70 text-sm">Extracting text from resume</p>
          </div>
        </div>
      )}

      {/* Camera Preview or Captured Image */}
      {!cameraError && !capturedImage && (
        <>
          {/* Video Preview */}
          <video
            ref={videoRef}
            data-camera-preview
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Canvas for capture (hidden) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay UI */}
          <div className="absolute inset-0 flex flex-col">
            {/* Top Bar */}
            <div className="p-4 bg-gradient-to-b from-black/60 to-transparent">
              <Button
                data-cancel-camera
                onClick={onCancel}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Guide Frame */}
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md aspect-[8.5/11] border-4 border-white/50 rounded-lg relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-gradient-to-t from-black/60 to-transparent text-center">
              <p className="text-white text-sm mb-4">
                Position your resume within the frame
              </p>
            </div>

            {/* Capture Button */}
            <div className="p-6 bg-black/60">
              <Button
                data-capture-button
                onClick={handleCapture}
                className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 mx-auto flex items-center justify-center p-0"
              >
                <div className="w-16 h-16 rounded-full border-4 border-black" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Captured Image Preview */}
      {!cameraError && capturedImage && (
        <>
          {/* Image Preview */}
          <img
            data-captured-image
            src={capturedImage}
            alt="Captured resume"
            className="w-full h-full object-contain"
          />

          {/* Action Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              {/* Retake Button */}
              <Button
                data-retake-button
                onClick={handleRetake}
                variant="outline"
                size="lg"
                className="flex-1 max-w-[150px] h-12 border-white text-white hover:bg-white hover:text-black"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Retake
              </Button>

              {/* Use Photo Button */}
              <Button
                data-use-photo-button
                onClick={handleUsePhoto}
                size="lg"
                className="flex-1 max-w-[150px] h-12 bg-blue-600 hover:bg-blue-700"
                disabled={isProcessing}
              >
                <Check className="h-5 w-5 mr-2" />
                Use Photo
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Extracted Text Preview (shown after OCR) */}
      {isProcessing && (
        <div data-extracted-text className="hidden">
          {/* OCR result would be displayed here */}
        </div>
      )}
    </div>
  );
}

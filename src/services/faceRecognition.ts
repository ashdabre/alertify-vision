
import { knownFaces } from '@/data/knownFaces';
import * as faceapi from 'face-api.js';

// Interface for recognized face with name
export interface RecognizedFace {
  id: string;
  name: string;
  category: 'user' | 'celebrity' | 'unknown';
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score?: number;
}

// Initialize face-api.js models with direct CDN URLs
export const loadFaceRecognitionModels = async () => {
  try {
    // Direct CDN URLs for the models
    const modelBaseUrl = 'https://justadudewhohacks.github.io/face-api.js/models';
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelBaseUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelBaseUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelBaseUrl),
    ]);
    return true;
  } catch (error) {
    console.error('Error loading face recognition models:', error);
    return false;
  }
};

// Create a face matcher with the labeled samples
let faceMatcher: faceapi.FaceMatcher | null = null;

// Load reference faces for comparison
export const loadReferenceFaces = async () => {
  try {
    const labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];
    
    // Load face descriptors for each known face
    for (const face of knownFaces) {
      try {
        const img = await faceapi.fetchImage(face.imageUrl);
        const detections = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (detections) {
          const descriptor = detections.descriptor;
          labeledDescriptors.push(
            new faceapi.LabeledFaceDescriptors(face.id, [descriptor])
          );
          console.log(`Successfully loaded face data for: ${face.name}`);
        } else {
          console.warn(`No face detected in reference image for: ${face.name}`);
        }
      } catch (err) {
        console.error(`Error processing reference face for ${face.name}:`, err);
        // Continue with other faces
      }
    }
    
    if (labeledDescriptors.length === 0) {
      console.warn('No reference faces could be loaded. Face recognition will be limited to detection only.');
      return false;
    }
    
    // Create face matcher with 0.6 distance threshold (adjust for sensitivity)
    faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    return true;
  } catch (error) {
    console.error('Error loading reference faces:', error);
    return false;
  }
};

// Recognize faces in an image/video frame
export const recognizeFaces = async (
  imageOrCanvas: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<RecognizedFace[]> => {
  try {
    // Detect all faces in the image
    const detections = await faceapi.detectAllFaces(imageOrCanvas);
    
    // If we don't have a face matcher or face recognition failed, just return basic detection
    if (!faceMatcher) {
      return detections.map(detection => {
        const box = detection.box;
        return {
          id: `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'Face Detected',
          category: 'unknown',
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          }
        };
      });
    }
    
    // With face matcher, attempt full recognition
    try {
      const detectionsWithDescriptors = await faceapi
        .detectAllFaces(imageOrCanvas)
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      // Match each descriptor to the reference faces
      return detectionsWithDescriptors.map(detection => {
        const match = faceMatcher!.findBestMatch(detection.descriptor);
        
        const knownFace = knownFaces.find(face => face.id === match.label);
        
        const box = detection.detection.box;
        
        if (match.label !== 'unknown' && knownFace) {
          // Found a match in our database
          return {
            id: knownFace.id,
            name: knownFace.name,
            category: knownFace.category,
            score: 1 - match.distance, // Convert distance to similarity score
            box: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height
            }
          };
        } else {
          // Unknown face
          return {
            id: `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Unknown',
            category: 'unknown',
            score: 1 - match.distance,
            box: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height
            }
          };
        }
      });
    } catch (err) {
      console.error('Error during face recognition, falling back to detection only:', err);
      // Fallback to basic detection
      return detections.map(detection => {
        const box = detection.box;
        return {
          id: `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'Face Detected',
          category: 'unknown',
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
          }
        };
      });
    }
  } catch (error) {
    console.error('Error recognizing faces:', error);
    return [];
  }
};

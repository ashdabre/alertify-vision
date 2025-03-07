
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BellRing, BellOff, AlertTriangle, Info, User } from "lucide-react";

interface DetectionSettingsProps {
  confidence: number;
  onConfidenceChange: (value: number) => void;
  isMuted: boolean;
  onMuteChange: () => void;
}

const DetectionSettings: React.FC<DetectionSettingsProps> = ({
  confidence,
  onConfidenceChange,
  isMuted,
  onMuteChange
}) => {
  return (
    <Card className="glass-card border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Face Recognition Settings</CardTitle>
        <CardDescription>
          Configure how the face recognition works
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">
                Face Detection Confidence Threshold
              </label>
              <span className="text-sm text-muted-foreground">
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <Slider
              value={[confidence]}
              min={0.1}
              max={0.9}
              step={0.05}
              onValueChange={(values) => onConfidenceChange(values[0])}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More sensitive (10%)</span>
              <span>Higher accuracy (90%)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <Info className="h-3 w-3 inline mr-1" />
              Lower values detect faces more easily but may include false positives.
              Higher values are more precise but might miss some faces in challenging conditions.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center">
                  {isMuted ? (
                    <BellOff className="h-4 w-4 mr-2 text-muted-foreground" />
                  ) : (
                    <BellRing className="h-4 w-4 mr-2" />
                  )}
                  <label className="text-sm font-medium">
                    Audio Alerts
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable voice notifications when faces are detected
                </p>
              </div>
              <Switch
                checked={!isMuted}
                onCheckedChange={() => onMuteChange()}
              />
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start pt-0">
        <div className="flex items-start p-3 bg-secondary/50 rounded-md w-full">
          <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium">About face recognition</p>
            <p className="text-muted-foreground">
              The face recognition model works best in good lighting conditions with clear, 
              unobstructed views of faces. This system is designed for general face detection
              and does not store or identify specific individuals.
            </p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DetectionSettings;

import React, { useEffect, useRef } from 'react';

interface CircleConfig {
  stroke: number;
  radius: number;
  color: string;
}

interface VideoPlayerProps {
  gazeDataFile: File;
  videoFile: File;
  circleConfig: CircleConfig;
}

const defaultCircleConfig: CircleConfig = {
  stroke: 2,
  radius: 5,
  color: '#FF0000', // Default color
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ gazeDataFile, videoFile, circleConfig = defaultCircleConfig }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadGazeData = async () => {
      const text = await gazeDataFile.text();
      const gazeData = text.split('\n').map(line => {
        const [x, y] = line.split(',').map(Number);
        return { x, y };
      });
      drawGazeData(gazeData);
    };

    const drawGazeData = (gazeData: Array<{ x: number; y: number }>) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (context && videoRef.current) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        gazeData.forEach(({ x, y }) => {
          context.beginPath();
          context.arc(x, y, circleConfig.radius, 0, 2 * Math.PI);
          context.strokeStyle = circleConfig.color;
          context.lineWidth = circleConfig.stroke;
          context.stroke();
        });
      }
    };

    loadGazeData();
  }, [gazeDataFile, circleConfig]);

  return (
    <div>
      <video ref={videoRef} src={URL.createObjectURL(videoFile)} controls />
      <canvas ref={canvasRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0 }} />
    </div>
  );
};

export default VideoPlayer;
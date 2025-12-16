export interface Point {
  x: number;
  y: number;
}

export interface ProcessingState {
  isProcessing: boolean;
  statusMessage: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}
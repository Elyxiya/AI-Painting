import { createContext, useContext, type RefObject } from 'react';
import type Konva from 'konva';

export const StageRefContext = createContext<RefObject<Konva.Stage | null> | null>(null);

export function useStageRef(): RefObject<Konva.Stage | null> | null {
  return useContext(StageRefContext);
}

export type Exercise = {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
  benefits: string[];
  pattern: {
    inhale: number;
    hold1?: number;
    exhale: number;
    hold2?: number;
  };
};

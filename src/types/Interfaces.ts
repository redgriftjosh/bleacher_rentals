export interface CustomButtonProps {
  title: string;
  onClick: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  isLoading?: boolean;
  style?: React.CSSProperties;
}

export interface CustomTextProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export interface IconProps {
  color?: string;
}

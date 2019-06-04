declare module 'react-lines-ellipsis/lib/html' {
  class HTMLEllipsis extends React.Component<{
    maxLine?: number;
    basedOn?: 'words' | 'letters';
    trimRight?: boolean;
    unsafeHTML: string;
  }> {}
  export = HTMLEllipsis;
}

declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

declare module 'tailwindcss' {
  const tailwind: any;
  export default tailwind;
}

declare module 'postcss' {
  const postcss: any;
  export default postcss;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// This tells TypeScript that CSS modules are valid
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// This tells TypeScript that @tailwind directives are valid
declare namespace CSS {
  interface AtRule {
    tailwind: any;
    apply: any;
    layer: any;
  }
}

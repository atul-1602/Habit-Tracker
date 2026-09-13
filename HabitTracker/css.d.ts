// Type declarations for CSS files imported as side effects
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

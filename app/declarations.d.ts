// Declaraciones para los imports de CSS del template Expo SDK 56
// (Metro los resuelve en web; TypeScript necesita saber que existen).
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
declare module "*.css";

// izitoast ships no types; only the members we use.
declare module 'izitoast' {
  interface IziToastSettings {
    title?: string;
    message?: string;
    titleColor?: string;
    messageColor?: string;
    backgroundColor?: string;
    theme?: string;
    iconColor?: string;
    progressBarColor?: string;
    position?: string;
    timeout?: number | false;
    resetOnHover?: boolean;
    transitionIn?: string;
    transitionOut?: string;
    displayMode?: number;
    maxWidth?: number;
    borderRadius?: string;
    boxShadow?: string;
  }

  interface IziToast {
    settings(settings: IziToastSettings): void;
    success(settings: IziToastSettings): void;
    error(settings: IziToastSettings): void;
  }

  const iziToast: IziToast;
  export default iziToast;
}

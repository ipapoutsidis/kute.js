export default transformFunctionsComponent;
declare namespace transformFunctionsComponent {
    export const component: string;
    export const property: string;
    export { supportedTransformProperties as subProperties };
    export { defaultTransformValues as defaultValues };
    export { transformFunctions as functions };
    export namespace Interpolate {
        export { perspective };
        export { translate3d };
        export { rotate3d };
        export { translate };
        export { rotate };
        export { scale };
        export { skew };
    }
}
declare const supportedTransformProperties: string[];
declare namespace defaultTransformValues {
    const perspective_1: number;
    export { perspective_1 as perspective };
    const translate3d_1: number[];
    export { translate3d_1 as translate3d };
    export const translateX: number;
    export const translateY: number;
    export const translateZ: number;
    const translate_1: number[];
    export { translate_1 as translate };
    const rotate3d_1: number[];
    export { rotate3d_1 as rotate3d };
    export const rotateX: number;
    export const rotateY: number;
    export const rotateZ: number;
    const rotate_1: number;
    export { rotate_1 as rotate };
    export const skewX: number;
    export const skewY: number;
    const skew_1: number[];
    export { skew_1 as skew };
    const scale_1: number;
    export { scale_1 as scale };
}
declare namespace transformFunctions {
    export { getTransform as prepareStart };
    export { prepareTransform as prepareProperty };
    export { onStartTransform as onStart };
    export { crossCheckTransform as crossCheck };
}
import perspective from "../interpolation/perspective.js";
import translate3d from "../interpolation/translate3d.js";
import rotate3d from "../interpolation/rotate3d.js";
import translate from "../interpolation/translate.js";
import rotate from "../interpolation/rotate.js";
import scale from "../interpolation/scale.js";
import skew from "../interpolation/skew.js";
declare function getTransform(tweenProperty: any): any;
declare function prepareTransform(prop: any, obj: any): {};
import { onStartTransform } from "./transformFunctionsBase.js";
declare function crossCheckTransform(tweenProp: any): void;

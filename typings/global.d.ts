/* typings/globals.d.ts */
import { Fwd } from '../src/fwd/Fwd';

/**
 * Allow to benefit from language services support when writing JS programs
 * in a typescript-enabled environment. It may make 'fwd' visible from everywhere
 * but it shouldn't be used from within the API, of course...
 */
declare namespace NodeJS {
  interface Global {
    fwd: Fwd;
  }
}
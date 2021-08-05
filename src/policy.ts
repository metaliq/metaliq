/**
 * The Policy namespace holds the interfaces for system Specifications and State.
 * These interfaces are extended within policy modules in order to build an overall policy
 * that encompasses their system capablities.
 *
 * See one of the included policy modules (such as validation) for a usage example.
 *
 * The convention is for policy interface extensions to appear first in a policy module,
 * followed by policy namespace declaration which merges those interface definitions
 * with the base ones declared here, followed by other policy module members
 * that work with the content of these interfaces.
 */

export declare namespace Policy {

  export interface Specification<T, P = any> {
    this?: Specification<T, P> // Self reference for easy inclusion of generic type parameters when merging
  }

  export interface State<T, P = any> {
    this?: State<T, P> // Self reference for easy inclusion of generic type parameters when merging
    parent?: P
  }
}
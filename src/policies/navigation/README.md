## MetaliQ Core Policy: Navigation

```bash
pnpm install @metaliq/navigation
```

The MetaliQ Navigation policy is one of the core policies provided in the @metaliq organisation on NPM, and is sourced from the MetaliQ mono-repository on GitHub.

It provides an abstraction for the mechanism of navigation within an application space, and is designed to be flexible and extendable enough to support various navigation needs.

### Data and Navigation Model

Most apps have a logical data model, based upon the business domain and the functionality of the app itself. In Metaliq, this application data model is defined as a TypeScript type, and is generally structured in a pragmatic, information-centric manner that does not necessarily map directly to an application's navigation structure.

For this reason the navigation model in a MetaliQ app is usually defined as a separate structure, which is also a TypeScript type. The type structure can be nested, to enable navigation to scale both up and down. The "leaf" nodes represent pages within the navigational system, and are defined with the specific data type that is provided to that page.

Note: recurrent navigational structures (such as trees) are not supported by this policy at this time.

A MetaliQ spec extends this core navigation model, including things such as; terminology labels - which can be used for menus, page headers and so on; validation elements - such as data-driven hide/show or enable/disabling of navigation options; and view specifications, used to display the target content for each node in the structure.

On start-up, this navigational structure is initialised into a Meta graph.

The navigation policy provides further specification terms, including  `route`, which takes a Route object that associates the "page" with a URL pattern with type-safe parameter parsing, browser history integration and deep-linking. 

The navigation policy also provides terms to support the navigation flow such as `onEnter, onLeave`, each of which is a $Fn for the specified type. These functions provide a granular way for applications to provision data loading, integration tasks and so on.

Additional terms can be supplied by specialised navigation models, such as sequential (for a wizard-like flow with additional inline validation and terminology for previous and next actions) or adventure (allowing movement along any of a node's connected edges).

### Navigation View Components

A navigation component is defined as a MetaView for the data type of the whole navigation structure. In some cases it can be helpful to build views that target a specific structure, particularly where different levels of sub-navigation across nested hierarchies should be precisely configured, such as in a specialised dashboard.

But in many cases, it makes sense to use a generic navigation component that dynamically adapts to the structure with which it is provided. Examples of these are included with the navigation policy, such as a sidebar navigator which adapts to a mobile friendly version, and a wizard-style user experience.

To make your own navigation components, follow the approaches in these samples to consume and provide interaction with the navigation policy model.  

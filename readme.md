![logo](./doc/logo.png)



## The MetaliQ Platform

MetaliQ is a platform for delivering online solutions as model-driven, policy-based, composable, runnable specifications.

The `metaliq` library and associated libraries in the `@metaliq` organisation provide a free, open-source framework for defining model-driven, policy-based specifications using TypeScript. It can be used independently to develop and build complete solutions. It is provided with ready-made policies for data validation and visualisation, interactive forms and more, and can be extended through custom policies to support any type of solution.

### Meta Systems

MetaliQ was created at Klaudhaus, and its approach of building solutions from policies, schemas and specifications comes from a consideration of how digital systems reflect organisational understanding, described in detail in a white paper called [The K-Factor](https://klaud.haus/k-factor).

The MetaliQ library provides structures and functions for defining specifications which extend a solution's underlying data model using terms that are provided by various policies.

#### Data Model

As an example, let's start with a business information type called Contact from the sample MetaliQ solution template `@metaliq/init-spa`.

```ts
export type Contact = {
  firstName: string
  lastName: string
  email: string
  phone: string
  age: number
}
```

Already, the outline of organisational knowledge is taking shape by knowing something about the information that we are dealing with - in this case, that a Contact has a name and various other properties. This is combined with all the other types of information to make up the solution's *data-model*.

#### Specifications

MetaliQ provides a way to extend this basic model by adding further layers of information-about-information - or *meta* information -  in the form of *specifications*. For example, here is a MetaliQ specification of the terminology we would like to use when presenting this information to a user:

```ts
export const contactSpec: MetaSpec<Contact> = {
  label: "Contact",
  helpText: "A business contact",
  fields: {
    firstName: {
      label: "Given Name"
    },
    lastName: {
      label: "Family Name"
    },
    email: {
      label: "Email Address"
    },
    phone: {
    	label: "Phone Number"
    },
    age: {
      label: "Age"
    }
  }
}
```

Because this is a MetaliQ specification, a developer can run this spec direct from the command line as follows:

```bash
metaliq run contactSpec
```

As we haven't provided any publication target or view information in the specification we will see a default interactive form with input fields for the data.

#### Policies

The terms *label* and *helpText* used by this specification come from a *Policy* - in this case the Terminology policy. Policies implement the "nuts and bolts" that make up various capabilities that any solution could use, and provide generic terms and functions that enable access to those capabilities. But all of the code that relates to the business knowledge of a *specific* solution is part of that solution's *specifications*. This simple pattern provides many benefits, helping to protect and preserve the value of business knowledge separately from technology practices and allowing them to evolve independently over time.

MetaliQ comes with a range of useful policies out of the box. For example, a typical front-end web app would use the Terminology policy we saw above, as well as:

* Presentation
  * A templating system for static pages or interactive apps using Google's `lit` library, along with a set of form components
* Validation
  * Providing type-safe validation and related user messaging for simple fields and complex entities
* Navigation
  * A type-safe URL routing capability for deep linking and browser history integration

* Publication
  * A policy which is generally used by all solutions to define their output artefacts
* Application
  * Another general purpose policy providing bootstrapping, logging and state transition management using the package `@metaliq/up`

### Project Workflow

#### Getting Started

Typically, a new solution starts with a Solution Template, which contains ready-made structure and specifications for a `metaliq` project. A solution template is published as a Git repository. A collection of solution templates is being made available within the `@metaliq` organisation on GitHub.

Alternatively, advanced coders may create MetaliQ projects from scratch or add MetaliQ to an existing project by including the relevant libraries and files. The solution templates can be used to understand the necessary structure and dependencies.

#### Composing Solutions

Specifications can be made up of terms from various policies, and can be structured inter-dependently in order to reference other specifications. For example, to specify an enrolment for a hypothetical kids activity we might include two contacts, the child and a guardian, with different validation rules (terms provided by the Validation policy) for each:

```ts
export type Enrollment = {
  student: Contact,
  guardian: Contact
}

export const EnrollmentSpec: MetaSpec<Enrollment> = {
  fields: {
    student: {
      ...contactSpec,
      label: "Student",
      helpText: "The participating child",
      fields: {
        ...contactSpec.fields,
        age: {
          label: "Student Age",
        	validator: max(15, "Students must be below 16")
        }
      }
    },
    guardian: {
      ...contactSpec,
      label: "Guardian",
      helpText: "Person responsible for the student",
      fields: {
        ...contactSpec.fields,
        age: {
        	...contactSpec.fields.age,
          validator: min(18, "Guardians must be adults")
        }
      }
    }
  }
}
```

You can see that individual specifications can be combined, extended and overriden at any level, and in any order. This is all manageable within the specification source code.

#### Publication Types

MetaliQ can be used to create artefacts of various different types, such as:

* single-page front-end web applications (SPA)
* cloud-based GraphQL microservices
* and any other kind of system...
  * by adding or extending the necessary policies - for example:
* COMING SOON: standards-based Web Components
  * for use in web apps built with any technology, such as React, Vue, WordPress ...
* COMING SOON: data-driven static content generators
  * e.g. for pre-rendered or server-rendered websites, emails etc.

Indeed, it can make sense to combine various different types of output in a single project, for example to create the back-end and user interface for a web-based solution. Each would be represented by a different specification, but as we've seen these could share and extend various other common specification elements.

The project output is normally specified using terms from the Publication policy. If no publication specification is present, MetaliQ uses a default Single Page Application setting, with a default view called a `metaForm`, hence the input forms we have been seeing.

#### Compiling

MetaliQ solutions are compiled automatically as part of the run and build processes described below, or can be compiled manually with the TypeScript compiler. MetaliQ makes use of the TypeScript generic type system to check for validity of all Specification terms at compile time. If using a suitable IDE such as VSCode, any invalid specification term is immediately highlighted.

#### Running in Development

To run a MetaliQ specification in development mode, use the command:

```sh
metaliq run
```

This will run a default specification called `appSpec` in the file `specs.ts` in the source folder. To run a different specification, identify it by name, and it's source file if necessary. For example, to run the spec *ContactSpec* in the file `src/specs/contacts.ts` use the command:

```sh
metaliq run -f specs/contacts contactSpec
```

(A pattern that works well for larger solutions is to split specifications across files in a `specs` folder, and then use the root `specs.ts` file to re-export the main ones that you will be running most frequently during your development.)

To see further options, use:

```sh
metaliq run --help
```

#### Building for Production

MetaliQ publication targets contain ready-made build processes to prepare optimized assets for production deployment. Similar to above, the following will build the spec called `appSpec`:

```sh
metaliq build
```

And as you might now expect, to build the spec *ContactSpec* in the file `src/specs/contacts.ts`:

```sh
metaliq build -f specs/contacts ContactSpec
```

And other options can be viewed with:

```sh
metaliq build --help
```

### Next Steps

#### The Meta-Graph

Read about the way that MetaliQ manages a graph of meta-objects in parallel with your application's data model [here](./doc/metas.md).

#### Solution Templates

Start with a simple solution template such as [`@metaliq/init-spa`](https://github.com/metaliq/init-spa).

#### State Transitions

Originally published as `lit-up`, the state transition management library has now been generalised to work with any runtime rendering or processing approach and published in the organisation package [`@metaliq/up`](https://www.npmjs.com/package/@metaliq/up).

#### Custom Policies

MetaliQ has a range of policies to support different system types, and can be extended by adding new policies which provide the necessary functionality and extend the Specification and State interfaces of the Policy namespace.

#### Support

MetaliQ is published under a permissive open source license (MIT) and may be used for any purpose. Community input is welcome but this license provides no implied warranties or service level agreements for things such as feature requests or issue resolution.

MetaliQ is still at a pre-1.0 release stage and although the main API is considered stable there may be further changes such as reorganising policy definitions.

If you have questions about how MetaliQ can support your organisation's solution requirements, feel free to contact us at [Klaudhaus](http://klaud.haus/contact). We provide training, mentoring and consultancy services around applying K-Factor strategies and delivering MetaliQ platform solutions across a range of industries.


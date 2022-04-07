import { MetaSpec } from "../meta"
import { Application, Contact, ContactCalcs } from "./test-types"

export const contactSpec: MetaSpec<Contact, any, ContactCalcs> = {
  calcs: {
    fullName: contact => contact.firstName + " " + contact.lastName
  },
  label: "Contact",
  fields: {
    firstName: {
      label: "First Name"
    },
    lastName: {
      label: "Last Name"
    },
    age: {
      label: "Age"
    }
  }
}

export const applicationSpec: MetaSpec<Application> = {
  fields: {
    applicant: {
      ...contactSpec,
      fields: {
        ...contactSpec.fields,
        age: {
          ...contactSpec.fields.age,
          validator: age => age >= 18
        }
      }
    }
  },
  init: {
    applicant: {
      firstName: "",
      lastName: "",
      age: null
    },
    billingAddress: {},
    deliveryAddress: {}
  }
}

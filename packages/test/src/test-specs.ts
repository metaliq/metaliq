import { MetaSpec } from "metaliq"
import { Address, Contact, Organisation } from "./test-types"

export const emptyContact = (): Contact => ({
  age: null,
  firstName: "",
  lastName: ""
})

export const emptyAddress = (): Address => ({
  streetNumber: "",
  streetName: "",
  suburb: "",
  state: "",
  postcode: ""
})

export const emptyOrganisation = (): Organisation => ({
  principal: emptyContact(),
  deliveryAddress: emptyAddress(),
  billingAddress: null
})

export const principal = (): Contact => ({
  firstName: "Dexter",
  lastName: "Sachell",
  age: 44
})

export const sampleOrganisation = (): Organisation => ({
  principal: principal(),
  billingAddress: emptyAddress(),
  deliveryAddress: emptyAddress()
})

export const contactSpec: MetaSpec<Contact, any> = {
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
    },
    isSelfEmployed: {
      label: "Is Self-Employed",
      hidden: (v, $) => $.parent.$.value.age < 18
    }
  }
}

export const organisationSpec: MetaSpec<Organisation> = {
  fields: {
    principal: {
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
  init: sampleOrganisation
}

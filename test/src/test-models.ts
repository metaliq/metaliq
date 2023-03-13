import { MetaModel } from "metaliq"
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

export const contactModel: MetaModel<Contact, any> = {
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
      hidden: (v, $) => $.parent.value.age < 18
    }
  }
}

export const organisationModel: MetaModel<Organisation> = {
  fields: {
    principal: {
      ...contactModel,
      fields: {
        ...contactModel.fields,
        age: {
          ...contactModel.fields.age,
          validator: age => age >= 18
        }
      }
    }
  },
  init: sampleOrganisation
}

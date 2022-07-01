import { MetaSpec, parent } from "../meta"
import { Address, Organisation, Contact } from "./test-types"

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

export const emptyApplication = (): Organisation => ({
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
      hidden: (_, contact) => parent(contact).age < 18
    }
  },
  init: emptyContact
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
  init: sampleOrganisation()
}

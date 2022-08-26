export type Address = {
  streetNumber?: string
  streetName?: string
  suburb?: string
  state?: string
  postcode?: string
}

export type Contact = {
  firstName?: string
  lastName?: string
  age?: number
  isSelfEmployed?: boolean
}

export type ContactCalcs = {
  fullName?: string
}

export type Organisation = {
  principal?: Contact
  employees?: Contact[]
  deliveryAddress: Address
  billingAddress: Address
}

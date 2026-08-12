import contactDetails from '@/config/contact-details.json'

export interface ContactDetails {
  siteResponsiblePerson: { name: string; email: string }
  routes: {
    generalEnquiry: string
    providerSupport: string
    billing: string
    disputes: string
    media: string
  }
  responseTime: string
  popiaInformationOfficer: { name: string; email: string }
}

export function getContactDetails(): ContactDetails {
  return contactDetails as ContactDetails
}

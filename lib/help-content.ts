import { COMMISSION_BRACKETS, PACKAGES, formatFee, formatRate } from '@/lib/pricing-config'

export type HelpAudience = 'customers' | 'providers'

export interface HelpQuestion {
  id: string
  question: string
  answer: string
}

export interface HelpTopic {
  id: string
  title: string
  questions: HelpQuestion[]
}

export interface HelpSection {
  audience: HelpAudience
  title: string
  topics: HelpTopic[]
}

const basePackage = PACKAGES[0]
const ceilingPackages = PACKAGES.filter((pkg) => pkg.ceilingRate !== null)

export const HELP_SECTIONS: HelpSection[] = [
  {
    audience: 'customers',
    title: 'For customers',
    topics: [
      {
        id: 'account',
        title: 'Account',
        questions: [
          {
            id: 'create-account',
            question: 'How do I create a ServicePros account?',
            answer:
              'Sign up with your email and password. You only need an account to book a service or leave a review — browsing providers and services doesn’t require one.',
          },
          {
            id: 'update-details',
            question: 'How do I update my account details?',
            answer: 'Go to your profile page in your account area to update your name, contact details, and notification preferences.',
          },
        ],
      },
      {
        id: 'credits-payments',
        title: 'Credits and payments',
        questions: [
          {
            id: 'what-are-credits',
            question: 'What are credits?',
            answer: `Credits are how you pay for bookings on ServicePros. 1 credit equals R1. Buy a pack once and spend the balance on any provider or service on the platform — there's no subscription for customers.`,
          },
          {
            id: 'how-buy-credits',
            question: 'How do I buy credits?',
            answer:
              'Go to your credits page in your account area, choose a pack, and pay securely via Yoco. Credits are added to your wallet immediately.',
          },
          {
            id: 'unused-credits',
            question: 'Do unused credits expire?',
            answer: 'No. Credits stay in your wallet until you spend them on a future booking.',
          },
        ],
      },
      {
        id: 'bookings',
        title: 'Bookings',
        questions: [
          {
            id: 'how-booking-works',
            question: 'How does booking a service work?',
            answer:
              'Choose a service package on a provider’s profile, review the price and delivery time, and confirm at checkout. Credits are deducted immediately and a message thread opens with the provider automatically.',
          },
          {
            id: 'provider-declines',
            question: 'What happens if a provider declines my booking?',
            answer: 'Your credits are returned to your wallet automatically. The same happens if a provider doesn’t respond in time and the request auto-expires.',
          },
          {
            id: 'cancel-booking',
            question: 'Can I cancel a booking?',
            answer:
              'You can cancel while it’s still awaiting the provider’s response. Once a provider has accepted, cancellation is handled as a dispute rather than an automatic refund — see our refund policy.',
          },
        ],
      },
      {
        id: 'listings-verification',
        title: 'Listings and verification',
        questions: [
          {
            id: 'what-does-verified-mean',
            question: 'What does a verification badge mean?',
            answer:
              'ServicePros has four independent verification badges — Contact, Google, CIPC, and FICA. Each confirms a different thing about the provider. See our verification page for exactly what each one checks.',
          },
          {
            id: 'unverified-meaning',
            question: 'What does "Unverified" mean?',
            answer: 'The provider’s details are self-reported and they haven’t completed any verification step yet. It doesn’t necessarily mean the business isn’t genuine.',
          },
        ],
      },
      {
        id: 'disputes',
        title: 'Disputes',
        questions: [
          {
            id: 'provider-misrepresents',
            question: 'What if a provider misrepresents themselves or the work?',
            answer:
              'Message them first to try to resolve it. If that doesn’t work, report the problem through our contact page and we’ll help mediate.',
          },
          {
            id: 'refund-process',
            question: 'How do refunds work?',
            answer: 'Refunds are issued as credits back to your wallet, not cash, except where the Consumer Protection Act entitles you to more. See our refund policy for the full detail.',
          },
        ],
      },
    ],
  },
  {
    audience: 'providers',
    title: 'For providers',
    topics: [
      {
        id: 'account',
        title: 'Account',
        questions: [
          {
            id: 'provider-signup',
            question: 'How do I list my business on ServicePros?',
            answer: 'Sign up as a provider, choose your business type, and complete onboarding to set up your profile, services, and packages.',
          },
        ],
      },
      {
        id: 'listings-verification-providers',
        title: 'Listings and verification',
        questions: [
          {
            id: 'get-verified',
            question: 'How do I get verified?',
            answer:
              'Contact, CIPC, and FICA verification are completed from your provider dashboard. Google verification is added automatically when we match your listing to a business confirmed by Google Places — you don’t apply for it.',
          },
          {
            id: 'price-changes',
            question: 'Can I change my service prices?',
            answer: `Yes. Small increases apply immediately. Larger increases go through moderation bands before taking effect, to protect customers from sudden unexplained jumps and protect you from being undercut by manipulated pricing.`,
          },
        ],
      },
      {
        id: 'subscriptions-commission',
        title: 'Subscriptions and commission',
        questions: [
          {
            id: 'how-much-subscription',
            question: 'How much does a subscription cost?',
            answer: `The base plan is ${formatFee(basePackage.monthlyFee)} a month. Ceiling packages that cap your commission rate cost more — see our pricing page for the full breakdown.`,
          },
          {
            id: 'when-commission-charged',
            question: 'When is commission charged?',
            answer:
              'Only on completed, paid bookings. You never pay commission on an enquiry, quote, or message that doesn’t turn into a booking.',
          },
          {
            id: 'commission-rate',
            question: 'What commission rate will I pay?',
            answer: `Commission scales with the value of each sale, from ${formatRate(COMMISSION_BRACKETS[0].rate)} on sales up to ${formatFee(COMMISSION_BRACKETS[0].max)}, up to ${formatRate(COMMISSION_BRACKETS[COMMISSION_BRACKETS.length - 1].rate)} on sales over ${formatFee(COMMISSION_BRACKETS[COMMISSION_BRACKETS.length - 2].max)}. A ceiling package caps how high that rate can go.`,
          },
          {
            id: 'ceiling-packages',
            question: 'What is a ceiling package?',
            answer: `A ceiling package caps your commission rate on larger sales. The lowest ceiling available is ${formatRate(ceilingPackages[ceilingPackages.length - 1].ceilingRate as number)}, on the ${ceilingPackages[ceilingPackages.length - 1].name} plan.`,
          },
        ],
      },
      {
        id: 'disputes-providers',
        title: 'Disputes',
        questions: [
          {
            id: 'customer-disputes-booking',
            question: 'What happens if a customer disputes a completed booking?',
            answer: 'Message the customer first to resolve it directly. If it escalates, contact support with your booking reference — we don’t issue automatic refunds on bookings you’ve already accepted and started.',
          },
          {
            id: 'account-suspended',
            question: 'Why was my account suspended?',
            answer: 'Accounts are reviewed or suspended for violating our provider terms, misleading customers, or circumventing platform fees. See our provider terms for the full detail.',
          },
        ],
      },
    ],
  },
]

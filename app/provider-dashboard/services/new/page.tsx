import { requireProviderSession } from '@/lib/session'
import { createService } from '@/lib/actions/services'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function NewServicePage() {
  await requireProviderSession()

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New service</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Give it a title and description — you can add the article and pricing packages on the next screen.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service basics</CardTitle>
          <CardDescription>You can change these later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createService} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="title">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="e.g. Wedding photography package"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="description">
                Short description <span className="text-destructive">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                placeholder="A brief summary shown in search results and listings."
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="serviceType">
                Booking type
              </label>
              <select
                id="serviceType"
                name="serviceType"
                defaultValue="fixed_deliverable"
                className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="fixed_deliverable">Order / Get Started (fixed deliverable — no time slot)</option>
                <option value="time_based">Book / Request to Book (time-based, requires scheduling)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-xl px-5 py-3 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Create service →
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

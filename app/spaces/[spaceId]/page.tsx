import { redirect } from 'next/navigation'

export default function SpacePage({
  params,
}: {
  params: { spaceId: string }
}) {
  // Default view: Agenci
  redirect(`/spaces/${params.spaceId}/agents`)
}

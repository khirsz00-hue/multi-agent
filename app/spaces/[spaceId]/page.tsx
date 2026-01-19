import { redirect } from 'next/navigation'

export default async function SpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>
}) {
  const { spaceId } = await params
  // Default view: Agenci
  redirect(`/spaces/${spaceId}/agents`)
}

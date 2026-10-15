import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-4xl">That page does not exist</h1>
      <p className="mt-3 text-fog-300">The link may be old, or the campaign may no longer be public.</p>
      <ButtonLink href="/campaigns" className="mt-8">
        Browse live campaigns
      </ButtonLink>
    </div>
  );
}

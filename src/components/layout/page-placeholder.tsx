import { Card } from "@/components/ui/card";

type PagePlaceholderProps = {
  title: string;
  description: string;
};

/**
 * Temporary content for app sections that aren't built yet. Rendering a real
 * page (instead of a 404) keeps the sidebar visible with the right link
 * highlighted. Replace each use with the real page when the feature lands.
 */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-269 flex-col gap-8">
      <div>
        <h1 className="text-page-title text-heading">{title}</h1>
        <p className="text-body text-foreground-muted">{description}</p>
      </div>
      <Card className="p-6">
        <p className="text-card-title text-heading">Coming soon</p>
        <p className="mt-1 text-body text-foreground-secondary">
          This section is being built. Check back soon.
        </p>
      </Card>
    </div>
  );
}

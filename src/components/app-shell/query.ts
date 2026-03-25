export type TenantSearchParams = {
  company?: string;
  user?: string;
  group?: string;
};

export function withTenantQuery(href: string, params: TenantSearchParams): string {
  const search = new URLSearchParams();

  if (params.company) {
    search.set("company", params.company);
  }

  if (params.user) {
    search.set("user", params.user);
  }

  if (params.group) {
    search.set("group", params.group);
  }

  const query = search.toString();
  return query ? `${href}?${query}` : href;
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DiscoverView } from "@/components/admin/DiscoverView";

function TruncatedCell({
  text,
  maxWidth = "200px",
}: {
  text: string;
  maxWidth?: string;
}) {
  const shouldShowTooltip = text && text !== "-";

  if (!shouldShowTooltip) {
    return <span>{text || "-"}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate block" style={{ maxWidth }}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function SchoolsAdminPage() {
  const [search, setSearch] = useState("");
  const [crawlStatus, setCrawlStatus] = useState<string | undefined>(undefined);
  const [lastScrapedFilter, setLastScrapedFilter] = useState<
    string | undefined
  >(undefined);
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } =
    trpc.schools.listWithCrawlStatus.useQuery({
      limit,
      offset: page * limit,
      search: search || undefined,
      crawlStatus: crawlStatus as
        | "pending"
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "never"
        | undefined,
      lastScrapedFilter: lastScrapedFilter as
        | "last7days"
        | "last30days"
        | "never"
        | undefined,
    });

  const enqueueMutation = trpc.crawlQueue.enqueue.useMutation({
    onSuccess: () => {
      toast.success("School enqueued for crawl");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to enqueue: ${error.message}`);
    },
  });

  const refreshMutation = trpc.seeds.refreshGooglePlaces.useMutation({
    onSuccess: () => {
      toast.success("Google Places data refreshed");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to refresh: ${error.message}`);
    },
  });

  const handleEnqueue = async (schoolId: string, domain: string | null) => {
    if (!domain) {
      toast.error("School does not have a domain");
      return;
    }
    // Construct URL from domain (prepend https:// if not present)
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    enqueueMutation.mutate({ schoolId, domain: url });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">Never</Badge>;
    }
    const variant =
      status === "completed"
        ? "default"
        : status === "failed"
        ? "destructive"
        : status === "processing"
        ? "secondary"
        : "outline";
    return <Badge variant={variant}>{status}</Badge>;
  };

  const [activeTab, setActiveTab] = useState("view");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Schools Management</h2>
        <p className="text-muted-foreground">
          View, discover, and add schools to the system
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view">View Schools</TabsTrigger>
          <TabsTrigger value="discover">Discover Schools</TabsTrigger>
          <TabsTrigger value="add">Add School</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Filter schools by status and search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search by name, domain, or city..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Crawl Status</label>
                  <Select
                    value={crawlStatus || "all"}
                    onValueChange={(value) => {
                      setCrawlStatus(value === "all" ? undefined : value);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Scraped</label>
                  <Select
                    value={lastScrapedFilter || "all"}
                    onValueChange={(value) => {
                      setLastScrapedFilter(value === "all" ? undefined : value);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="last7days">Last 7 days</SelectItem>
                      <SelectItem value="last30days">Last 30 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schools</CardTitle>
              <CardDescription>
                {data?.total !== undefined
                  ? `Total: ${data.total.toLocaleString()}`
                  : "Loading..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : !data?.schools || data.schools.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No schools found
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Crawl Status</TableHead>
                          <TableHead>Last Scraped</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.schools.map((school) => {
                          const addressText = school.addrStd
                            ? typeof school.addrStd === "object"
                              ? `${
                                  (school.addrStd as Record<string, unknown>)
                                    .streetAddress || ""
                                } ${
                                  (school.addrStd as Record<string, unknown>)
                                    .city || ""
                                } ${
                                  (school.addrStd as Record<string, unknown>)
                                    .state || ""
                                }`.trim() || "-"
                              : String(school.addrStd)
                            : "-";

                          return (
                            <TableRow key={school.id}>
                              <TableCell className="font-medium">
                                <TruncatedCell
                                  text={school.canonicalName}
                                  maxWidth="250px"
                                />
                              </TableCell>
                              <TableCell>
                                <TruncatedCell
                                  text={school.domain || "-"}
                                  maxWidth="200px"
                                />
                              </TableCell>
                              <TableCell>
                                <TruncatedCell
                                  text={addressText}
                                  maxWidth="300px"
                                />
                              </TableCell>
                              <TableCell>{school.phone || "-"}</TableCell>
                              <TableCell>
                                {getStatusBadge(school.crawlStatus)}
                              </TableCell>
                              <TableCell>
                                {formatDate(school.lastScraped)}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {school.googlePlaceId ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            refreshMutation.mutate({
                                              schoolId: school.id,
                                            })
                                          }
                                          disabled={refreshMutation.isPending}
                                        >
                                          {refreshMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <RefreshCw className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Refresh Google Places data</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                  {school.domain ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleEnqueue(
                                              school.id,
                                              school.domain
                                            )
                                          }
                                          disabled={enqueueMutation.isPending}
                                        >
                                          {enqueueMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Play className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Enqueue Crawl</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      No domain
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {page * limit + 1}-
                      {Math.min((page + 1) * limit, data.total || 0)} of{" "}
                      {data.total || 0}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data?.hasMore}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
          <DiscoverView />
        </TabsContent>

        <TabsContent value="add" className="space-y-6">
          <AddSchoolForm
            onSuccess={() => {
              setActiveTab("view");
              refetch();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddSchoolForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("US");

  const importMutation = trpc.seeds.import.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.isNew
          ? `Successfully created school: ${name}`
          : `Successfully linked to existing school: ${name}`
      );
      // Reset form
      setName("");
      setWebsite("");
      setPhone("");
      setCity("");
      setState("");
      setCountry("US");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to add school: ${error.message}`);
    },
  });

  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("School name is required");
      return;
    }

    if (!website.trim()) {
      toast.error("Website is required");
      return;
    }

    if (!city.trim()) {
      toast.error("City is required");
      return;
    }

    const address = `${city}, ${state} ${country}`.trim();

    // Try to geocode the address using tRPC
    let lat = 0;
    let lng = 0;
    try {
      const geocodeResult = await utils.seeds.geocode.fetch({ address });
      if (geocodeResult) {
        lat = geocodeResult.lat;
        lng = geocodeResult.lng;
      } else {
        toast.warning("Could not geocode address, using default coordinates");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.warning("Could not geocode address, using default coordinates");
    }

    // Create a minimal Google Places-like structure
    importMutation.mutate({
      name: name.trim(),
      website: website.trim(),
      phone: phone.trim() || undefined,
      address,
      lat,
      lng,
      addressComponents: [
        { types: ["locality"], longText: city, shortText: city },
        ...(state
          ? [
              {
                types: ["administrative_area_level_1"],
                longText: state,
                shortText: state,
              },
            ]
          : []),
        { types: ["country"], longText: country, shortText: country },
      ],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add School Manually</CardTitle>
        <CardDescription>
          Enter school information to add it to the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">School Name *</Label>
            <Input
              id="name"
              placeholder="Example Flight School"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website *</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Austin"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="TX"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="US"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={importMutation.isPending}>
              {importMutation.isPending ? "Adding..." : "Add School"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setName("");
                setWebsite("");
                setPhone("");
                setCity("");
                setState("");
                setCountry("US");
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

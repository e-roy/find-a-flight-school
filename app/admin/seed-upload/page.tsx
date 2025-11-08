"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { uploadSeeds } from "./actions";
import Link from "next/link";

export default function SeedUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const uploadResult = await uploadSeeds(formData);
    setResult({
      inserted: uploadResult.inserted,
      skipped: uploadResult.skipped,
      errors: uploadResult.errors,
    });
    setIsUploading(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Seed Upload</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to load seed candidates into the database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            CSV must have headers: name, city, state, country, phone, website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                disabled={isUploading}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={!file || isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/seeds">View Seeds</Link>
              </Button>
            </div>
          </form>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="p-4 rounded-lg border bg-muted/50">
                <h3 className="font-semibold mb-2">Upload Summary</h3>
                <p className="text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    {result.inserted} rows inserted
                  </span>
                  {result.skipped > 0 && (
                    <>
                      {" • "}
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {result.skipped} rows skipped
                      </span>
                    </>
                  )}
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                  <h3 className="font-semibold mb-2 text-destructive">
                    Errors
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {result.errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-destructive">
                        Row {error.row}: {error.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

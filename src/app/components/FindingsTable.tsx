"use client";

import { Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export type Findings = Record<string, number>;

export default function FindingsTable({ findings }: { findings: Findings | null }) {
  if (!findings) return null;
  const entries = Object.entries(findings).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle className="text-lg">Detected Sensitive Data</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>InfoType</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(([type, count]) => (
                  <TableRow key={type}>
                    <TableCell className="font-mono">{type}</TableCell>
                    <TableCell>{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
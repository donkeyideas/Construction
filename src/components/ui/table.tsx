import { forwardRef } from "react";
import { ChevronUp, ChevronDown, Inbox } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ---- Table Root ---- */
const Table = forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="ui-table-wrap">
    <table ref={ref} className={cn("ui-table", className)} {...props} />
  </div>
));
Table.displayName = "Table";

/* ---- TableHeader (thead) ---- */
const TableHeader = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={className} {...props} />
));
TableHeader.displayName = "TableHeader";

/* ---- TableBody (tbody) ---- */
const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={className} {...props} />
));
TableBody.displayName = "TableBody";

/* ---- TableRow (tr) ---- */
const TableRow = forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr ref={ref} className={className} {...props} />
));
TableRow.displayName = "TableRow";

/* ---- TableHead (th) ---- */
export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sortDirection, onSort, children, ...props }, ref) => (
    <th ref={ref} className={className} {...props}>
      {sortable ? (
        <button
          type="button"
          className="ui-table-th-sortable"
          onClick={onSort}
          aria-label={`Sort column ${sortDirection === "asc" ? "descending" : "ascending"}`}
        >
          {children}
          <span
            className="ui-table-sort-icon"
            data-direction={sortDirection || undefined}
          >
            <ChevronUp
              size={12}
              style={{
                opacity: sortDirection === "asc" ? 1 : 0.3,
                marginBottom: -3,
              }}
            />
            <ChevronDown
              size={12}
              style={{
                opacity: sortDirection === "desc" ? 1 : 0.3,
                marginTop: -3,
              }}
            />
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  )
);
TableHead.displayName = "TableHead";

/* ---- TableCell (td) ---- */
const TableCell = forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={className} {...props} />
));
TableCell.displayName = "TableCell";

/* ---- TableEmpty ---- */
export interface TableEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  colSpan?: number;
}

function TableEmpty({
  title = "No data",
  description = "There are no records to display.",
  icon,
  colSpan = 99,
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="ui-table-empty">
        <div className="ui-table-empty-icon">
          {icon || <Inbox size={40} />}
        </div>
        <div className="ui-table-empty-title">{title}</div>
        <div className="ui-table-empty-desc">{description}</div>
      </td>
    </tr>
  );
}
TableEmpty.displayName = "TableEmpty";

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
};

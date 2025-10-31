/**
 * Tests for Table Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

describe('Table Component', () => {
  const TableExample = () => (
    <Table>
      <TableCaption>Employee List</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>Engineer</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>Designer</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell>2 employees</TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );

  it('should render table with all components', () => {
    render(<TableExample />);

    expect(screen.getByText('Employee List')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('should have correct HTML structure', () => {
    render(<TableExample />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(3);

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should apply custom className to Table', () => {
    render(
      <Table className="custom-table">
        <TableBody>
          <TableRow>
            <TableCell>Test</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByRole('table');
    expect(table).toHaveClass('custom-table');
  });

  it('should apply custom className to TableHead', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="custom-head">Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    const header = screen.getByText('Header');
    expect(header).toHaveClass('custom-head');
  });

  it('should apply custom className to TableCell', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="custom-cell">Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByText('Cell');
    expect(cell).toHaveClass('custom-cell');
  });

  it('should apply custom className to TableRow', () => {
    render(
      <Table>
        <TableBody>
          <TableRow className="custom-row">
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByText('Cell');
    const row = cell.closest('tr');
    expect(row).toHaveClass('custom-row');
  });

  it('should have correct styles for table header', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    const header = screen.getByText('Header');
    expect(header).toHaveClass('font-medium', 'text-left');
  });

  it('should have correct styles for table cells', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByText('Cell');
    expect(cell).toHaveClass('p-4');
  });

  it('should have correct styles for table caption', () => {
    render(
      <Table>
        <TableCaption>Caption</TableCaption>
      </Table>
    );

    const caption = screen.getByText('Caption');
    expect(caption).toHaveClass('text-sm', 'text-gray-500');
  });

  it('should have hover styles on table rows', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByText('Cell');
    const row = cell.closest('tr');
    expect(row).toHaveClass('hover:bg-gray-50');
  });

  it('should render table without caption', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(screen.queryByRole('caption')).not.toBeInTheDocument();
  });

  it('should render table without footer', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('should support multiple columns', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Col 1</TableHead>
            <TableHead>Col 2</TableHead>
            <TableHead>Col 3</TableHead>
            <TableHead>Col 4</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
  });

  it('should support multiple rows', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Row 1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Row 2</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Row 3</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 2')).toBeInTheDocument();
    expect(screen.getByText('Row 3')).toBeInTheDocument();
  });

  it('should have border styling', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByRole('table');
    const wrapper = table.parentElement;
    expect(wrapper).toHaveClass('border', 'rounded-lg');
  });
});

#!/usr/bin/env python
import argparse
import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import datetime
import csv
import io

# The working connection string we found
WORKING_CONNECTION = "postgresql://postgres.jkwqwteudheerzvhhibv:almascp2002256512@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

class SupabaseClient:
    def __init__(self, connection_string=WORKING_CONNECTION):
        self.connection_string = connection_string
        self.conn = None
        self.cursor = None
    
    def connect(self):
        """Connect to the Supabase PostgreSQL database."""
        try:
            self.conn = psycopg2.connect(self.connection_string, sslmode="require")
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def disconnect(self):
        """Close the database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
    
    def execute_query(self, query, params=None):
        """Execute a query and return the results."""
        try:
            if not self.conn or self.conn.closed:
                self.connect()
            
            # Trim whitespace and check if empty
            trimmed_query = query.strip()
            if not trimmed_query:
                return []
                
            # Skip comment-only SQL
            if all(line.strip().startswith('--') for line in trimmed_query.split('\n') if line.strip()):
                return []
            
            # Extract the first non-comment line to determine query type
            actual_query = ""
            for line in trimmed_query.split('\n'):
                if line.strip() and not line.strip().startswith('--'):
                    actual_query = line.strip()
                    break
            
            # Execute the query with parameters
            self.cursor.execute(trimmed_query, params or {})
            
            # For SELECT queries, return the results
            if actual_query.upper().startswith("SELECT"):
                results = self.cursor.fetchall()
                return results if results else []
            # For other queries (INSERT, UPDATE, DELETE), commit and return affected rows
            else:
                self.conn.commit()
                return {"affected_rows": self.cursor.rowcount}
        except Exception as e:
            if self.conn:
                self.conn.rollback()
            raise e
        finally:
            self.disconnect()

    def get_tables(self):
        """Get a list of all tables in the public schema."""
        query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
        """
        return self.execute_query(query)
    
    def get_table_schema(self, table_name):
        """Get the schema for a specific table."""
        query = """
        SELECT 
            column_name, 
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
        FROM 
            information_schema.columns 
        WHERE 
            table_name = %s
            AND table_schema = 'public'
        ORDER BY 
            ordinal_position
        """
        return self.execute_query(query, (table_name,))
    
    def get_row_count(self, table_name):
        """Get the number of rows in a table."""
        query = f"SELECT COUNT(*) as count FROM {table_name}"
        result = self.execute_query(query)
        return result[0]['count'] if result else 0

def format_output(results, format_type, output_file=None):
    """Format the query results based on the specified format type."""
    # Check if results is empty or None
    if not results:
        return "No results found."
    
    # Check if it's a dictionary (for non-SELECT queries)
    if isinstance(results, dict):
        if "affected_rows" in results:
            formatted = f"Query executed successfully. Affected rows: {results['affected_rows']}"
            if output_file:
                with open(output_file, 'w') as f:
                    f.write(formatted)
                return f"Results written to {output_file}"
            return formatted
    
    # For SELECT queries with results
    if format_type == "json":
        # Convert datetime and similar objects to strings for JSON serialization
        def json_serializer(obj):
            if isinstance(obj, (datetime.datetime, datetime.date)):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")
        
        formatted = json.dumps(results, indent=2, default=json_serializer)
        
    elif format_type == "csv":
        output = io.StringIO()
        if results and len(results) > 0:
            writer = csv.DictWriter(output, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
            formatted = output.getvalue()
        else:
            formatted = "No results found."
        
    elif format_type == "table":
        if not results or len(results) == 0:
            return "No results found."
        
        # Get column names
        columns = list(results[0].keys())
        
        # Convert all values to strings and handle None values
        str_results = []
        for row in results:
            str_row = {}
            for col in columns:
                val = row[col]
                if val is None:
                    str_row[col] = "NULL"
                elif isinstance(val, (datetime.datetime, datetime.date)):
                    str_row[col] = val.isoformat()
                else:
                    str_row[col] = str(val)
            str_results.append(str_row)
        
        # Calculate column widths (min 4 characters)
        col_widths = {col: max(len(col), 4, max([len(row[col]) for row in str_results])) for col in columns}
        
        # Build header
        header = " | ".join([col.ljust(col_widths[col]) for col in columns])
        separator = "-+-".join(["-" * col_widths[col] for col in columns])
        
        # Build rows
        rows = [" | ".join([row[col].ljust(col_widths[col]) for col in columns]) for row in str_results]
        
        # Combine
        formatted = f"{header}\n{separator}\n" + "\n".join(rows)
    else:
        formatted = str(results)
    
    # Write to file if specified
    if output_file:
        with open(output_file, 'w') as f:
            f.write(formatted)
        return f"Results written to {output_file}"
    
    return formatted

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description="Supabase Database CLI Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test connection
  python db.py --test
  
  # List all tables
  python db.py --list-tables
  
  # Show schema for a table
  python db.py --schema profiles
  
  # Count rows in a table
  python db.py --count profiles
  
  # Execute a SQL query
  python db.py "SELECT * FROM profiles LIMIT 5"
  
  # Execute a SQL query and output as JSON
  python db.py "SELECT * FROM profiles LIMIT 5" --output json
  
  # Execute a SQL query and save to file
  python db.py "SELECT * FROM profiles" --output csv --file results.csv
  
  # Execute a query from a file
  python db.py --query-file my_query.sql
""")
    
    # Command groups
    group = parser.add_mutually_exclusive_group()
    group.add_argument("query", nargs="?", help="SQL query to execute")
    group.add_argument("-t", "--test", action="store_true", help="Test database connection")
    group.add_argument("-l", "--list-tables", action="store_true", help="List all tables")
    group.add_argument("-s", "--schema", metavar="TABLE", help="Show schema for the specified table")
    group.add_argument("-c", "--count", metavar="TABLE", help="Count rows in the specified table")
    group.add_argument("-qf", "--query-file", help="Execute SQL query from a file")
    
    # Output options
    parser.add_argument("-o", "--output", choices=["json", "table", "csv"], default="table", 
                      help="Output format (default: table)")
    parser.add_argument("-f", "--file", help="Output file to write results to")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show more detailed output")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Initialize client
    client = SupabaseClient()
    
    try:
        # Test connection
        if args.test:
            if args.verbose:
                print("Testing connection to Supabase...")
            
            if client.connect():
                print("SUCCESS: Connected to Supabase database")
                # Get some basic info
                tables = client.get_tables()
                print(f"Found {len(tables)} tables:")
                for table in tables:
                    row_count = client.get_row_count(table['table_name'])
                    print(f"- {table['table_name']} ({row_count} rows)")
            else:
                print("FAILED: Could not connect to Supabase database")
            return
        
        # List tables
        elif args.list_tables:
            if args.verbose:
                print("Fetching tables...")
            
            tables = client.get_tables()
            formatted = format_output(tables, args.output, args.file)
            print(formatted)
            return
        
        # Show table schema
        elif args.schema:
            if args.verbose:
                print(f"Fetching schema for table '{args.schema}'...")
            
            schema = client.get_table_schema(args.schema)
            if not schema:
                print(f"Table '{args.schema}' not found or has no columns")
                return
            
            formatted = format_output(schema, args.output, args.file)
            print(formatted)
            return
        
        # Count rows in table
        elif args.count:
            if args.verbose:
                print(f"Counting rows in table '{args.count}'...")
            
            count = client.get_row_count(args.count)
            print(f"Table '{args.count}' has {count} rows")
            return
        
        # Execute query from file
        elif args.query_file:
            if args.verbose:
                print(f"Reading query from file '{args.query_file}'...")
            
            try:
                with open(args.query_file, 'r') as f:
                    query = f.read()
            except Exception as e:
                print(f"Error reading file: {e}")
                return
            
            if args.verbose:
                print(f"Executing query: {query[:50]}..." if len(query) > 50 else f"Executing query: {query}")
            
            results = client.execute_query(query)
            formatted = format_output(results, args.output, args.file)
            print(formatted)
            return
        
        # Execute query from command line
        elif args.query:
            if args.verbose:
                print(f"Executing query: {args.query[:50]}..." if len(args.query) > 50 else f"Executing query: {args.query}")
            
            results = client.execute_query(args.query)
            formatted = format_output(results, args.output, args.file)
            print(formatted)
            return
        
        # If no command specified, print help
        else:
            parser.print_help()
    
    except Exception as e:
        print(f"Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()

#!/usr/bin/env python
"""
Test script for the Supabase database client.
This script runs a series of tests to demonstrate the functionality of the db.py tool.
"""

import os
import subprocess
import json
import time

def run_command(cmd):
    """Run a command and return the output."""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running command: {result.stderr}")
        return None
    return result.stdout.strip()

def main():
    # Create a test directory if it doesn't exist
    test_dir = "test_results"
    if not os.path.exists(test_dir):
        os.mkdir(test_dir)
    
    print("=" * 50)
    print("SUPABASE DATABASE CLIENT TEST SCRIPT")
    print("=" * 50)
    print(f"Starting tests at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test 1: Connection Test
    print("\n--- Test 1: Connection Test ---")
    output = run_command("python db.py --test --verbose")
    print(output)
    
    # Test 2: List Tables
    print("\n--- Test 2: List Tables ---")
    output = run_command("python db.py --list-tables")
    print(output)
    
    # Test 3: Get Schema for Profiles Table
    print("\n--- Test 3: Get Schema for Profiles Table ---")
    run_command("python db.py --schema profiles --output json --file test_results/profiles_schema.json")
    
    # Load and display the results
    try:
        with open("test_results/profiles_schema.json", "r") as f:
            schema = json.load(f)
            print(f"Profiles table has {len(schema)} columns:")
            for col in schema:
                print(f"  - {col['column_name']} ({col['data_type']})")
    except Exception as e:
        print(f"Error reading schema: {e}")
    
    # Test 4: Count rows in Posts table
    print("\n--- Test 4: Count Rows in Posts Table ---")
    output = run_command("python db.py --count posts")
    print(output)
    
    # Test 5: Simple SELECT Query
    print("\n--- Test 5: Simple SELECT Query ---")
    output = run_command("python db.py \"SELECT id, name, username FROM profiles LIMIT 3\"")
    print(output)
    
    # Test 6: JOIN Query from file
    print("\n--- Test 6: JOIN Query from File ---")
    # Create test query file
    query = """
    -- Get messages with sender and recipient details
    SELECT 
        m.id,
        m.content,
        m.created_at,
        s.name as sender_name,
        r.name as recipient_name
    FROM 
        messages m
    JOIN 
        profiles s ON m.sender_id = s.id
    JOIN 
        profiles r ON m.recipient_id = r.id
    ORDER BY 
        m.created_at DESC
    LIMIT 5;
    """
    
    with open("test_results/messages_query.sql", "w") as f:
        f.write(query)
    
    run_command("python db.py --query-file test_results/messages_query.sql --output json --file test_results/messages_results.json")
    
    # Load and display the results
    try:
        with open("test_results/messages_results.json", "r") as f:
            messages = json.load(f)
            print(f"Found {len(messages)} messages:")
            for msg in messages[:2]:  # Show only first 2 for brevity
                print(f"  - {msg['sender_name']} to {msg['recipient_name']}: {msg['content'][:30]}...")
            if len(messages) > 2:
                print(f"  - ... and {len(messages) - 2} more")
    except Exception as e:
        print(f"Error reading messages: {e}")
    
    # Test 7: CSV Output
    print("\n--- Test 7: CSV Output ---")
    run_command("python db.py \"SELECT id, name, username FROM profiles\" --output csv --file test_results/profiles.csv")
    
    # Display the CSV content
    try:
        with open("test_results/profiles.csv", "r") as f:
            csv_content = f.read()
            print("CSV Output:")
            print(csv_content)
    except Exception as e:
        print(f"Error reading CSV: {e}")
    
    # Test 8: Complex Query with Aggregation
    print("\n--- Test 8: Complex Query with Aggregation ---")
    complex_query = """
    SELECT 
        p.user_id, 
        pr.name as author_name,
        COUNT(*) as post_count,
        MIN(p.created_at) as first_post,
        MAX(p.created_at) as last_post
    FROM 
        posts p
    JOIN
        profiles pr ON p.user_id = pr.id
    GROUP BY 
        p.user_id, pr.name
    ORDER BY 
        post_count DESC;
    """
    
    output = run_command(f"python db.py \"{complex_query}\"")
    print(output)
    
    print("\n" + "=" * 50)
    print(f"Tests completed at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

if __name__ == "__main__":
    main()

# Security Policy

## Supported Scope

Security reports are welcome for:

- authentication and session handling
- row-level security
- private group visibility
- competition visibility, voting, and comments
- storage access and signed URL behavior
- secret handling and production configuration

## How to Report

Do not open public GitHub issues for vulnerabilities.

Use GitHub private vulnerability reporting as the primary reporting channel for this repository.

If private vulnerability reporting is not available for some reason, contact the maintainer privately before disclosing anything publicly.

Include:

- summary of the issue
- impact
- reproduction steps
- proof of concept if available
- suggested mitigation if known

## Disclosure Expectations

- give maintainers reasonable time to reproduce and fix the issue
- avoid public disclosure before a fix or mitigation is in place
- avoid accessing data that is not your own while testing

## Current High-Sensitivity Areas

- Supabase RLS and access scope inheritance
- storage buckets and signed audio delivery
- OAuth redirect configuration
- private competition and group visibility

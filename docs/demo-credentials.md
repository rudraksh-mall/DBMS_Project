# Demo Credentials

Created by `npm run seed` (backend). All passwords below are for local
demonstration only.

## Administrator

| Name | Email | Password |
| --- | --- | --- |
| System Admin | `admin@civicfix.test` | `Admin@12345` |

## Authority (ward officers)

| Name | Email | Password | Ward |
| --- | --- | --- | --- |
| Aarti Verma | `authority.lucknow@civicfix.test` | `Authority@123` | Hazratganj / Ward 1 (Lucknow) |
| Rakesh Singh | `authority.prayagraj@civicfix.test` | `Authority@123` | Civil Lines (Prayagraj) |
| Neha Gupta | `authority.gorakhpur@civicfix.test` | `Authority@123` | Golghar (Gorakhpur) |

## Citizens

| Name | Email | Password |
| --- | --- | --- |
| Priya Sharma | `citizen1@civicfix.test` | `Citizen@123` |
| Amit Kumar | `citizen2@civicfix.test` | `Citizen@123` |
| Sara Khan | `citizen3@civicfix.test` | `Citizen@123` |
| Rahul Yadav | `citizen4@civicfix.test` | `Citizen@123` |

## Seeded content

- **8 wards** across Lucknow, Prayagraj and Gorakhpur (real polygon boundaries).
- **10 complaints** spanning every status (`submitted`, `acknowledged`,
  `in_progress`, `resolved`) and all four priority tiers.
- **19 upvotes** and a full **complaint_status_history** trail.

The seed is idempotent — re-running `npm run seed` never duplicates these rows.
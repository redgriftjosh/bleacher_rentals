SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: Addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Addresses" ("address_id", "created_at", "street", "city", "state_province", "zip_postal") VALUES
	(2, '2025-04-15 03:24:27.716952+00', '12 Winding Way, Belvidere, NJ, USA', 'Belvidere', 'New Jersey', '07823'),
	(20, '2025-05-22 15:46:53.925854+00', '13990 Mississauga Road, Cheltenham, ON, Canada', 'Cheltenham', 'Ontario', 'L7C 1W4'),
	(19, '2025-05-22 15:44:41.004155+00', '11 2nd St, Orangeville, ON, Canada', 'Orangeville', 'Ontario', 'L9W 2B6'),
	(34, '2025-05-22 18:15:43.974287+00', '35921 Talbot Line, Shedden, ON, Canada', 'Shedden', 'Ontario', 'N0L 2E0'),
	(38, '2025-05-22 18:56:00.064399+00', 'U.S. 51, Amite City, LA, USA', 'Amite City', 'Louisiana', ''),
	(31, '2025-05-22 16:53:34.965108+00', 'Porsche Experience Centre Toronto, Porsche Drive, Pickering, Ontario, Canada', 'Pickering', 'Ontario', 'L1W 0B9'),
	(44, '2025-05-22 19:26:46.922025+00', '409 Bell Rd, Rome, NY, USA', 'Rome', 'New York', '13440'),
	(5, '2025-05-01 14:34:00.427121+00', '7550 Shady Park Drive, Greenwell Springs, LA, USA', 'Central', 'Louisiana', '70739'),
	(70, '2025-06-13 20:03:51.320513+00', '300 Christopher Drive, Cambridge, ON, Canada', 'Cambridge', 'Ontario', 'N1P 1A1'),
	(7, '2025-05-22 14:22:01.312248+00', '2525 Alta Vista Drive, Ottawa, ON, Canada', 'Ottawa', 'Ontario', 'K1V 7T3'),
	(52, '2025-06-13 18:08:05.515135+00', '18297 Hurontario Street, Caledon Village, ON, Canada', 'Caledon Village', 'Ontario', 'L7K 0Y5'),
	(10, '2025-05-22 14:39:11.71734+00', '815 St. Laurent Blvd, Ottawa, ON, Canada', 'Ottawa', 'Ontario', 'K1K 3A7'),
	(12, '2025-05-22 15:13:05.899218+00', '366117 U.S. 62, Boley, OK, USA', 'Boley', 'Oklahoma', '74829'),
	(13, '2025-05-22 15:16:35.93311+00', '3545 Lone Star Circle, Fort Worth, TX, USA', 'Fort Worth', 'Texas', '76177'),
	(14, '2025-05-22 15:18:25.910807+00', '2401 Destiny Way, Odessa, FL, USA', 'Odessa', 'Florida', '33556'),
	(15, '2025-05-22 15:21:17.500079+00', '2100 Richard Arrington Junior Boulevard North, Birmingham, AL, USA', 'Birmingham', 'Alabama', '35203'),
	(16, '2025-05-22 15:25:06.387204+00', '1311 Music Hall Road, Hiawassee, GA, USA', 'Hiawassee', 'Georgia', '30546'),
	(17, '2025-05-22 15:30:52.42863+00', '1225 Clearlake Rd, Cocoa, FL, USA', 'Cocoa', 'Florida', '32922'),
	(18, '2025-05-22 15:41:31.427593+00', '1802 Regional Rd 97, Puslinch, ON, Canada', 'Puslinch', 'Ontario', 'N1R 5S7'),
	(22, '2025-05-22 15:56:21.562519+00', '65 R Ranch Road, Dahlonega, GA, USA', 'Dahlonega', 'Georgia', '30533'),
	(23, '2025-05-22 15:58:30.839437+00', '1 Audrey Zapp Drive, Jersey City, NJ, USA', 'Jersey City', 'New Jersey', '07305'),
	(24, '2025-05-22 16:01:50.93833+00', '1100 Niagara Street, Welland, ON, Canada', 'Welland', 'Ontario', 'L3C 1M6'),
	(25, '2025-05-22 16:04:16.078804+00', '1258 Turkey Point Road, Simcoe, ON, Canada', 'Simcoe', 'Ontario', 'N3Y 4K1'),
	(26, '2025-05-22 16:07:29.669445+00', '231 Ian Macdonald Boulevard, North York, ON, Canada', 'Toronto', 'Ontario', 'M7A 2C5'),
	(28, '2025-05-22 16:14:05.434694+00', '292 Conestoga Drive, Brampton, ON, Canada', 'Brampton', 'Ontario', 'L6Z 3M1'),
	(29, '2025-05-22 16:36:49.513959+00', '545 North Albany Avenue, Atlantic City, NJ, USA', 'Atlantic City', 'New Jersey', '08401'),
	(36, '2025-05-22 18:46:55.040396+00', '250 Fort York Boulevard, Toronto, ON, Canada', 'Toronto', 'Ontario', 'M5V 1A9'),
	(37, '2025-05-22 18:52:20.482786+00', '7300 West Credit Avenue, Mississauga, ON, Canada', 'Mississauga', 'Ontario', 'L5N 5N1'),
	(39, '2025-05-22 19:04:15.067799+00', '100 Garrison Road, Toronto, ON, Canada', 'Toronto', 'Ontario', 'M5V 3K9'),
	(40, '2025-05-22 19:10:39.606124+00', '4235 New Street, Burlington, ON, Canada', 'Burlington', 'Ontario', 'L7L 1T2'),
	(42, '2025-05-22 19:21:07.042315+00', '9250 State Avenue, Kansas City, KS, USA', 'Kansas City', 'Kansas', '66112'),
	(43, '2025-05-22 19:24:14.485873+00', 'Waco Convention Center, 100 Washington Ave, Waco, TX, USA', 'Waco', 'Texas', '76701'),
	(46, '2025-05-22 19:36:58.01308+00', '11624 South Distribution Cove, Olive Branch, MS, USA', 'Olive Branch', 'Mississippi', '38654'),
	(53, '2025-06-13 18:11:17.747694+00', 'Dallas Trailer Repair Co, Texas 356, Irving, TX, USA', 'Irving', 'Texas', '75060'),
	(41, '2025-05-22 19:14:15.515522+00', '7044 Chatham-Kent County Road 35, Pain Court, ON, Canada', '', 'Ontario', 'N0P 1Z0'),
	(27, '2025-05-22 16:11:34.087077+00', '129 Beech Street, Clinton, ON, Canada', 'Clinton', 'Ontario', 'N0M 1L0'),
	(56, '2025-06-13 18:43:39.0536+00', '35 Nolan Rd, Whitesboro, TX, USA', 'Whitesboro', 'Texas', '76273'),
	(57, '2025-06-13 18:47:10.417786+00', '2 Galleria Pkwy SE, Atlanta, GA, USA', 'Atlanta', 'Georgia', '30339'),
	(60, '2025-06-13 19:12:21.864589+00', '180 Tremaine Avenue South, Listowel, ON, Canada', 'Listowel', 'Ontario', 'N4W 2C9'),
	(63, '2025-06-13 19:35:02.611908+00', '215 Sydney Washer Rd, Dover, FL, USA', 'Dover', 'Florida', '33527'),
	(64, '2025-06-13 19:39:22.707841+00', '3601 Villa Rica Highway, Dallas, GA, USA', 'Dallas', 'Georgia', '30157'),
	(65, '2025-06-13 19:43:29.514357+00', '112 SW Ave C, Seminole, TX, USA', 'Seminole', 'Texas', '79360'),
	(68, '2025-06-13 19:57:00.791461+00', '1186 Prince St, Lansdowne, ON, Canada', '', 'Ontario', 'K0E 1L0'),
	(69, '2025-06-13 20:00:20.795302+00', '850 Princess Street, Mount Forest, ON, Canada', 'Mount Forest', 'Ontario', 'N0G 2L3'),
	(76, '2025-06-16 19:04:18.054378+00', '22079 South White Sands Road, Ste. Genevieve, MO, USA', 'Ste. Genevieve', 'Missouri', '63670'),
	(75, '2025-06-16 19:02:37.824167+00', '460 West Hightower Trail, Conyers, GA, USA', 'Conyers', 'Georgia', '30012'),
	(77, '2025-06-16 19:08:33.260929+00', '5212 N Oakland Gravel Rd, Columbia, MO, USA', 'Columbia', 'Missouri', '65202'),
	(55, '2025-06-13 18:39:29.162234+00', '84328 Lucknow Line, Dungannon, ON, Canada', 'Dungannon', 'Ontario', 'N0M 1R0'),
	(21, '2025-05-22 15:53:13.88233+00', '3001 Atlantic Avenue, Virginia Beach, VA, USA', 'Virginia Beach', 'Virginia', '23451'),
	(32, '2025-05-22 17:07:24.659652+00', '3310 Walnut Street, Alvinston, ON, Canada', 'Alvinston', 'Ontario', 'N0N 1A0'),
	(58, '2025-06-13 18:57:44.54004+00', '875 Nellis Street, Woodstock, ON, Canada', 'Woodstock', 'Ontario', 'N4S 4C6'),
	(33, '2025-05-22 17:33:40.217678+00', '557 Walter Street, Lucknow, ON, Canada', 'Lucknow', 'Ontario', 'N0G 2H0'),
	(45, '2025-05-22 19:30:23.427939+00', '139 Pine St E, Aylmer, ON, Canada', 'Aylmer', 'Ontario', 'N5H 1N5'),
	(81, '2025-06-26 18:56:34.893712+00', '123 William Street, New York, NY, USA', 'New York', 'New York', '10038'),
	(83, '2025-07-02 12:29:12.286191+00', '12 Rexway Road, London, ON, Canada', 'London', 'Ontario', 'N6G 3C3'),
	(82, '2025-06-27 19:54:16.310793+00', '930 Towne Avenue, Los Angeles, CA, USA', 'Los Angeles', 'California', '90021'),
	(47, '2025-05-23 14:20:04.548139+00', 'Timmermans'' Ranch and horse stables, Nixon Road, Simcoe, ON, Canada', 'Simcoe', 'Ontario', 'N3Y 4K6'),
	(74, '2025-06-13 20:25:21.984203+00', '900 East Market Street, San Antonio, TX, USA', 'San Antonio', 'Texas', '78205'),
	(62, '2025-06-13 19:22:56.322751+00', '777 Seneca Allegany Blvd, Salamanca, NY, USA', 'Salamanca', 'New York', '14779'),
	(61, '2025-06-13 19:15:11.132674+00', '180 Tremaine Avenue South, Listowel, ON, Canada', 'Listowel', 'Ontario', 'N4W 2C9'),
	(73, '2025-06-13 20:22:06.766052+00', '383 Belle River Rd E, South Woodslee, ON, Canada', 'South Woodslee', 'Ontario', 'N0R 1V0'),
	(30, '2025-05-22 16:47:09.110941+00', '702 South Commerce Street, Lockhart, TX, USA', 'Lockhart', 'Texas', '78644'),
	(66, '2025-06-13 19:49:21.768868+00', '2454 Nixon Rd, Simcoe, ON, Canada', 'Simcoe', 'Ontario', 'N3Y 4K6'),
	(67, '2025-06-13 19:54:02.354872+00', '268 Currie Street, Glencoe, ON, Canada', 'Glencoe', 'Ontario', 'N0L 1M0'),
	(11, '2025-05-22 14:48:26.539746+00', 'Osprey Community Arena, COUNTY RD, Singhampton, ON, Canada', 'Singhampton', 'Ontario', 'N0C 1M0'),
	(78, '2025-06-16 19:10:32.514856+00', '19477 Fairground Rd, Robertsdale, AL, USA', 'Robertsdale', 'Alabama', '36567'),
	(71, '2025-06-13 20:08:25.365845+00', 'Chiefswood Rd, Ohsweken, ON, Canada', 'Ohsweken', 'Ontario', ''),
	(72, '2025-06-13 20:14:12.498931+00', '462 Wilson Farm Rd, Calabogie, ON, Canada', 'Calabogie', 'Ontario', 'K0J 1H0'),
	(84, '2025-07-02 12:29:12.438056+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(85, '2025-07-02 12:47:21.221955+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(86, '2025-07-02 12:47:21.354815+00', '12 Rexway Road, London, ON, Canada', 'London', 'Ontario', 'N6G 3C3'),
	(87, '2025-07-02 14:20:43.158299+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(88, '2025-07-02 14:21:22.554694+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(89, '2025-07-02 14:21:47.158137+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(110, '2025-08-04 16:04:54.72713+00', '', '', '', ''),
	(90, '2025-07-02 14:23:09.3993+00', '12 Rexway Road, London, ON, Canada', 'London', 'Ontario', 'N6G 3C3'),
	(91, '2025-07-02 14:37:13.52847+00', 'Clementi Avenue 3, 321 Clementi, Singapore', 'Singapore', '', '129905'),
	(103, '2025-07-27 14:42:39.203204+00', '123 William Street, New York, NY, USA', 'New York', 'New York', '10038'),
	(117, '2025-09-20 21:20:04.041272+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(134, '2025-10-16 21:56:45.286137+00', '12 Winding Way, Bay City, TX, USA', 'Bay City', 'Texas', '77414'),
	(139, '2025-10-30 22:14:45.561824+00', 'Avenida de las Américas 1254, Country Club, Guadalajara, Jalisco, Mexico', 'Guadalajara', 'Jalisco', '44610'),
	(140, '2025-10-30 22:14:45.70393+00', 'Prosta 51, Warsaw, Poland', 'Warszawa', 'Województwo mazowieckie', '00-838'),
	(133, '2025-10-16 20:12:16.347532+00', '15 Scotchpine Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 2E1'),
	(92, '2025-07-03 18:45:56.070194+00', 'GMXW+3G Port Hope Simpson, NL, Canada', 'Port Hope Simpson', 'Newfoundland and Labrador', ''),
	(93, '2025-07-04 21:39:27.614488+00', '123 William Street, New York, NY, USA', 'New York', 'New York', '10038'),
	(94, '2025-07-04 21:39:27.737092+00', '4 Canada''s Wonderland Drive, Vaughan, ON, Canada', 'Vaughan', 'Ontario', 'L6A 4Z3'),
	(95, '2025-07-06 14:18:29.121006+00', 'Luxor Hotel & Casino, South Las Vegas Boulevard, Las Vegas, NV, USA', 'Las Vegas', 'Nevada', '89119'),
	(96, '2025-07-06 14:18:29.210676+00', 'London, ON, Canada', 'London', 'Ontario', ''),
	(97, '2025-07-06 14:22:09.731496+00', '12 Apostles, Victoria, Australia', '', 'Victoria', ''),
	(98, '2025-07-06 14:22:09.79958+00', '32 London Road, St Albans, UK', '', 'England', 'AL1 1NG'),
	(99, '2025-07-07 13:18:40.451532+00', 'Timmermans'' Ranch and horse stables, Nixon Road, Simcoe, ON, Canada', 'Simcoe', 'Ontario', 'N3Y 4K6'),
	(100, '2025-07-07 13:18:40.53793+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(101, '2025-07-07 13:27:47.158188+00', 'Timmermans'' Ranch and horse stables, Nixon Road, Simcoe, ON, Canada', 'Simcoe', 'Ontario', 'N3Y 4K6'),
	(102, '2025-07-07 13:27:47.293319+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(104, '2025-07-28 14:42:23.965974+00', 'Timmermans'' Ranch and horse stables, Nixon Road, Simcoe, ON, Canada', 'Simcoe', 'Ontario', 'N3Y 4K6'),
	(105, '2025-07-28 14:42:24.07913+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(123, '2025-10-06 08:49:35.04859+00', '12 Winding Way, Bay City, TX, USA', 'Bay City', 'Texas', '77414'),
	(124, '2025-10-06 08:49:35.135121+00', '12 Rexway Rd, London, ON, Canada', 'London', 'Ontario', 'N6G 3C3'),
	(106, '2025-07-28 14:46:35.650175+00', 'Timmermans'' Ranch and horse stables, Nixon Road, Simcoe, ON, Canada', 'Simcoe', 'Ontario', 'N3Y 4K6'),
	(107, '2025-07-28 14:46:35.761473+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(120, '2025-09-22 05:41:11.933775+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(131, '2025-10-16 20:00:05.71254+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(79, '2025-06-16 19:12:26.911417+00', '250 Jake Mintz Road, Gadsden, AL, USA', 'Gadsden', 'Alabama', '35905'),
	(119, '2025-09-22 05:38:15.22602+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(115, '2025-08-08 20:00:04.902265+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(116, '2025-08-08 20:00:05.007538+00', '', '', '', ''),
	(108, '2025-08-01 14:14:08.257866+00', 'Lavalle 1234, AAF, Buenos Aires, Argentina', 'AAF', 'Ciudad Autónoma de Buenos Aires', 'C1048'),
	(109, '2025-08-01 14:14:08.407081+00', '123 William Street, New York, NY, USA', 'New York', 'New York', '10038'),
	(112, '2025-08-05 19:35:23.573157+00', '12 Winding Way, Lewistown, PA, USA', 'Lewistown', 'Pennsylvania', '17044'),
	(113, '2025-08-05 19:35:23.759139+00', '23 Paskal Shopping Center, Jalan Pasir Kaliki, Kebon Jeruk, Bandung City, West Java, Indonesia', '', 'Jawa Barat', '40241'),
	(48, '2025-06-04 17:03:16.274185+00', 'Will Rogers Memorial Center, West Lancaster Avenue, Fort Worth, TX, USA', 'Fort Worth', 'Texas', '76107'),
	(141, '2025-10-31 15:28:36.95588+00', '12 Apostles, Victoria, Australia', '', 'Victoria', ''),
	(130, '2025-10-16 20:00:05.579408+00', '12 Rexway Drive, Georgetown, ON, Canada', 'Halton Hills', 'Ontario', 'L7G 1P8'),
	(121, '2025-09-30 18:33:42.666777+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(122, '2025-09-30 18:33:42.828211+00', '12 Rexway Rd, London, ON, Canada', 'London', 'Ontario', 'N6G 3C3'),
	(142, '2025-10-31 18:40:39.866416+00', '12 Rex Gate, Etobicoke, ON, Canada', 'Toronto', 'Ontario', 'M9W 3G4'),
	(143, '2025-10-31 18:40:40.022907+00', '12 Rexway Road, London, ON, Canada', 'London', 'Ontario', 'N6G 3C3'),
	(137, '2025-10-17 16:03:51.778465+00', '', '', '', ''),
	(138, '2025-10-17 16:03:51.898007+00', '', '', '', ''),
	(132, '2025-10-16 20:12:16.249482+00', '12 Rexway Lane, Collegedale, TN, USA', 'Chattanooga', 'Tennessee', '37363'),
	(125, '2025-10-06 14:37:20.242611+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(135, '2025-10-16 22:05:38.74147+00', '', '', '', ''),
	(136, '2025-10-16 22:05:38.852677+00', '', '', '', ''),
	(129, '2025-10-15 21:32:51.89735+00', '12 Winding Way, Bay City, TX, USA', 'Bay City', 'Texas', '77414'),
	(127, '2025-10-06 16:11:03.015335+00', '12 Rexway Rd, London, ON, Canada', 'London', 'Ontario', 'N6G 3C3');


--
-- Data for Name: HomeBases; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."HomeBases" ("home_base_id", "created_at", "home_base_name") VALUES
	(1, '2025-04-15 03:15:10.124023+00', 'Florida'),
	(2, '2025-04-15 03:15:18.721663+00', 'Georgia'),
	(3, '2025-04-15 03:15:27.327178+00', 'Texas'),
	(4, '2025-04-15 03:15:35.664421+00', 'Oklahoma'),
	(5, '2025-04-15 03:15:46.090151+00', 'Ontario'),
	(6, '2025-04-30 14:50:11.974349+00', 'Wisconsin'),
	(7, '2025-04-30 14:50:27.499893+00', 'Louisiana'),
	(8, '2025-04-30 14:58:27.789355+00', 'Arizona'),
	(10, '2025-06-04 02:08:08.307478+00', 'Mississippi'),
	(11, '2025-06-04 02:08:27.501917+00', 'New Jersey'),
	(12, '2025-06-04 02:09:01.684404+00', 'Virginia'),
	(13, '2025-06-16 14:42:48.604887+00', 'Missouri'),
	(14, '2025-06-16 14:51:01.07885+00', 'Alabama'),
	(9, '2025-06-04 02:06:20.625603+00', 'New Yorkkkk');


--
-- Data for Name: Bleachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Bleachers" ("bleacher_id", "created_at", "bleacher_number", "home_base_id", "winter_home_base_id", "bleacher_rows", "bleacher_seats", "created_by", "updated_at", "updated_by", "linxup_device_id") VALUES
	(2, '2025-04-28 15:09:32.118054+00', 2, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(3, '2025-04-28 18:09:17.727234+00', 3, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(4, '2025-04-29 13:49:51.724322+00', 4, 3, 3, 10, 260, NULL, NULL, NULL, NULL),
	(5, '2025-04-29 13:50:35.310087+00', 5, 5, 5, 10, 300, NULL, NULL, NULL, NULL),
	(8, '2025-04-30 14:39:24.710786+00', 7, 5, 5, 10, 240, NULL, NULL, NULL, NULL),
	(9, '2025-04-30 14:40:38.163055+00', 8, 5, 5, 10, 240, NULL, NULL, NULL, NULL),
	(10, '2025-04-30 14:41:34.547139+00', 9, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(11, '2025-04-30 14:42:08.371224+00', 10, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(12, '2025-04-30 14:44:51.826568+00', 11, 4, 4, 15, 450, NULL, NULL, NULL, NULL),
	(13, '2025-04-30 14:45:34.866947+00', 12, 2, 2, 10, 300, NULL, NULL, NULL, NULL),
	(14, '2025-04-30 14:46:01.21991+00', 13, 2, 2, 10, 300, NULL, NULL, NULL, NULL),
	(15, '2025-04-30 15:01:28.762251+00', 14, 8, 8, 10, 260, NULL, NULL, NULL, NULL),
	(16, '2025-04-30 15:01:49.991194+00', 15, 8, 8, 10, 260, NULL, NULL, NULL, NULL),
	(17, '2025-04-30 15:07:05.562893+00', 16, 3, 3, 10, 300, NULL, NULL, NULL, NULL),
	(18, '2025-04-30 15:07:29.493219+00', 17, 3, 3, 10, 300, NULL, NULL, NULL, NULL),
	(19, '2025-04-30 15:10:06.251383+00', 18, 7, 1, 10, 300, NULL, NULL, NULL, NULL),
	(20, '2025-04-30 15:10:25.490681+00', 19, 1, 1, 10, 300, NULL, NULL, NULL, NULL),
	(21, '2025-04-30 15:12:19.534018+00', 20, 3, 3, 10, 300, NULL, NULL, NULL, NULL),
	(22, '2025-04-30 15:13:18.488821+00', 21, 1, 1, 7, 120, NULL, NULL, NULL, NULL),
	(23, '2025-04-30 18:54:52.387162+00', 22, 1, 1, 7, 120, NULL, NULL, NULL, NULL),
	(24, '2025-04-30 18:55:03.950811+00', 23, 1, 1, 7, 120, NULL, NULL, NULL, NULL),
	(25, '2025-04-30 19:07:37.193627+00', 24, 1, 1, 9, 180, NULL, NULL, NULL, NULL),
	(26, '2025-04-30 19:08:05.463917+00', 25, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(27, '2025-04-30 19:08:50.117187+00', 26, 4, 8, 15, 450, NULL, NULL, NULL, NULL),
	(28, '2025-04-30 19:09:17.449164+00', 27, 2, 1, 15, 450, NULL, NULL, NULL, NULL),
	(29, '2025-04-30 20:44:36.100772+00', 28, 7, 1, 10, 300, NULL, NULL, NULL, NULL),
	(30, '2025-04-30 20:45:55.193303+00', 29, 3, 3, 9, 180, NULL, NULL, NULL, NULL),
	(31, '2025-04-30 20:46:17.060882+00', 30, 1, 1, 10, 260, NULL, NULL, NULL, NULL),
	(32, '2025-04-30 20:46:55.577548+00', 31, 1, 1, 7, 120, NULL, NULL, NULL, NULL),
	(33, '2025-04-30 20:47:26.149253+00', 32, 3, 3, 10, 300, NULL, NULL, NULL, NULL),
	(34, '2025-04-30 20:47:56.557177+00', 33, 3, 3, 10, 300, NULL, NULL, NULL, NULL),
	(35, '2025-04-30 20:48:17.116886+00', 34, 3, 3, 15, 450, NULL, NULL, NULL, NULL),
	(36, '2025-04-30 20:51:23.440585+00', 35, 2, 1, 15, 450, NULL, NULL, NULL, NULL),
	(37, '2025-04-30 20:51:43.692128+00', 36, 2, 1, 10, 260, NULL, NULL, NULL, NULL),
	(38, '2025-04-30 20:51:57.455375+00', 37, 2, 1, 10, 300, NULL, NULL, NULL, NULL),
	(39, '2025-04-30 20:53:29.140164+00', 38, 1, 1, 10, 260, NULL, NULL, NULL, NULL),
	(40, '2025-04-30 20:53:46.876798+00', 39, 3, 3, 10, 300, NULL, NULL, NULL, NULL),
	(41, '2025-04-30 20:54:09.061189+00', 40, 2, 1, 10, 260, NULL, NULL, NULL, NULL),
	(42, '2025-04-30 20:54:44.606117+00', 41, 4, 1, 10, 300, NULL, NULL, NULL, NULL),
	(43, '2025-04-30 20:55:10.705453+00', 42, 5, 5, 7, 96, NULL, NULL, NULL, NULL),
	(44, '2025-04-30 20:55:38.268434+00', 43, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(45, '2025-04-30 20:56:11.814795+00', 44, 5, 1, 15, 450, NULL, NULL, NULL, NULL),
	(46, '2025-04-30 20:56:31.729997+00', 45, 5, 5, 8, 123, NULL, NULL, NULL, NULL),
	(47, '2025-04-30 20:56:56.539754+00', 46, 5, 5, 10, 300, NULL, NULL, NULL, NULL),
	(48, '2025-04-30 20:57:29.047995+00', 47, 5, 5, 10, 300, NULL, NULL, NULL, NULL),
	(49, '2025-04-30 20:57:56.557532+00', 48, 5, 5, 10, 300, NULL, NULL, NULL, NULL),
	(51, '2025-04-30 20:58:33.807909+00', 50, 1, 1, 15, 450, NULL, NULL, NULL, NULL),
	(50, '2025-04-30 20:58:13.84182+00', 49, 5, 5, 10, 300, NULL, NULL, NULL, NULL),
	(52, '2025-05-01 13:54:18.833542+00', 51, 3, 3, 15, 450, NULL, NULL, NULL, NULL),
	(53, '2025-05-01 13:54:39.97021+00', 52, 5, 5, 10, 300, NULL, NULL, NULL, NULL),
	(54, '2025-05-01 13:54:59.423331+00', 53, 1, 1, 7, 120, NULL, NULL, NULL, NULL),
	(55, '2025-05-01 13:55:31.979873+00', 54, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(56, '2025-05-01 13:56:16.209189+00', 55, 5, 1, 15, 450, NULL, NULL, NULL, NULL),
	(57, '2025-05-01 13:56:37.530651+00', 56, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(58, '2025-05-01 13:57:28.411383+00', 57, 3, 1, 15, 450, NULL, NULL, NULL, NULL),
	(59, '2025-05-01 13:58:20.360028+00', 58, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(60, '2025-05-01 14:01:07.857093+00', 59, 3, 1, 15, 450, NULL, NULL, NULL, NULL),
	(61, '2025-05-01 14:03:19.163612+00', 60, 3, 3, 15, 450, NULL, NULL, NULL, NULL),
	(62, '2025-05-01 14:03:43.927261+00', 61, 1, 1, 15, 450, NULL, NULL, NULL, NULL),
	(63, '2025-05-01 14:04:04.672591+00', 62, 1, 1, 7, 100, NULL, NULL, NULL, NULL),
	(65, '2025-05-01 14:05:47.591039+00', 63, 5, 5, 7, 200, NULL, NULL, NULL, NULL),
	(66, '2025-05-01 14:06:04.622231+00', 64, 5, 5, 7, 200, NULL, NULL, NULL, NULL),
	(67, '2025-05-01 14:06:24.875897+00', 65, 5, 1, 15, 450, NULL, NULL, NULL, NULL),
	(68, '2025-05-01 14:07:14.829734+00', 66, 5, 1, 15, 450, NULL, NULL, NULL, NULL),
	(69, '2025-05-01 14:07:36.907401+00', 67, 5, 1, 15, 450, NULL, NULL, NULL, NULL),
	(70, '2025-05-01 14:07:51.229179+00', 68, 5, 1, 15, 450, NULL, NULL, NULL, NULL),
	(71, '2025-05-01 14:08:23.550716+00', 69, 1, 1, 15, 450, NULL, NULL, NULL, NULL),
	(72, '2025-05-01 14:08:40.210892+00', 70, 3, 3, 15, 450, NULL, NULL, NULL, NULL),
	(73, '2025-05-01 14:10:11.130347+00', 71, 5, 5, 7, 100, NULL, NULL, NULL, NULL),
	(74, '2025-05-01 14:10:26.242999+00', 72, 5, 5, 7, 100, NULL, NULL, NULL, NULL),
	(75, '2025-05-01 14:11:06.958737+00', 73, 5, 5, 7, 100, NULL, NULL, NULL, NULL),
	(76, '2025-05-01 14:11:23.337227+00', 74, 5, 5, 7, 100, NULL, NULL, NULL, NULL),
	(77, '2025-05-01 14:12:21.310939+00', 75, 5, 5, 7, 150, NULL, NULL, NULL, NULL),
	(78, '2025-05-01 14:12:41.374311+00', 76, 5, 5, 10, 140, NULL, NULL, NULL, NULL),
	(79, '2025-05-01 14:13:02.079264+00', 77, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(80, '2025-05-01 14:14:59.848998+00', 78, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(81, '2025-05-01 14:16:23.870556+00', 79, 5, 5, 7, 150, NULL, NULL, NULL, NULL),
	(82, '2025-05-01 14:16:41.280285+00', 80, 3, 3, 7, 100, NULL, NULL, NULL, NULL),
	(83, '2025-05-01 14:16:55.775471+00', 81, 3, 3, 7, 100, NULL, NULL, NULL, NULL),
	(84, '2025-05-01 14:17:12.538174+00', 82, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(85, '2025-05-01 14:17:29.675475+00', 83, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(86, '2025-05-01 14:18:09.186555+00', 84, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(88, '2025-05-01 14:18:44.935996+00', 85, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(89, '2025-05-01 14:19:23.84754+00', 86, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(90, '2025-05-01 14:19:43.602069+00', 87, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(91, '2025-05-01 14:20:05.495826+00', 88, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(92, '2025-05-01 14:20:21.873513+00', 89, 5, 5, 10, 285, NULL, NULL, NULL, NULL),
	(93, '2025-05-01 14:20:45.528168+00', 90, 5, 5, 15, 450, NULL, NULL, NULL, NULL),
	(94, '2025-05-01 14:21:26.505798+00', 91, 7, 4, 15, 450, NULL, NULL, NULL, NULL),
	(95, '2025-06-16 19:25:04.993902+00', 92, 3, 3, 7, 108, NULL, NULL, NULL, NULL),
	(96, '2025-06-16 19:25:24.557747+00', 93, 3, 3, 7, 108, NULL, NULL, NULL, NULL),
	(97, '2025-06-18 19:11:38.218696+00', 401, 5, 5, 4, 20, NULL, NULL, NULL, '861861043871287'),
	(1, '2025-04-15 03:16:44.907213+00', 1, 1, 5, 10, 300, NULL, NULL, NULL, '861861044535113');


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Users" ("user_id", "created_at", "first_name", "last_name", "email", "phone", "clerk_user_id", "avatar_image_url", "role", "status") VALUES
	(25, '2025-11-11 21:38:25.338365+00', 'Josh', 'Driver TPI', 'josh@tpi-3.ca', NULL, 'user_2z1NhDViQ5mjZ91HsZlmDXXLcCT', NULL, 2, 2),
	(44, '2025-11-18 17:28:42.567924+00', 'Joshh', 'Applee', 'redgriftjosh@gmail.com', NULL, 'user_35f2pOOvsfbnuYFRKDMmPKqcc5f', NULL, 2, 2),
	(24, '2025-08-05 20:15:16.838182+00', 'Josh2', 'Driver', 'josh+2@tpi-3.ca', NULL, NULL, NULL, 3, 2),
	(23, '2025-08-04 20:23:17.937481+00', 'Josh1', 'Driver', 'josh+1@tpi-3.ca', NULL, NULL, NULL, 3, 2),
	(22, '2025-06-30 18:47:50.129475+00', 'Josh', 'Driver', 'redgriftjosh+driver@gmail.com', NULL, NULL, NULL, 3, 2),
	(27, '2025-11-14 20:18:42.735823+00', 'Josh3', 'Redgrift', 'josh+3@tpi-3.ca', NULL, 'user_35U5BS0wN7l0PPnLr5pnpPvQdgr', NULL, 1, 2),
	(1, '2025-06-20 15:44:36.28203+00', 'JoshOld', 'RedgriftOLD', 'redgriftjosh+old@gmail.com', NULL, '', NULL, 2, 2);


--
-- Data for Name: Events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: BleacherEvents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: BleacherUsers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."BleacherUsers" ("bleacher_user_id", "created_at", "user_id", "bleacher_id", "season") VALUES
	(28, '2025-10-14 15:02:04.286044+00', 1, 1, 'SUMMER'),
	(29, '2025-10-14 15:02:04.286044+00', 1, 2, 'SUMMER'),
	(30, '2025-10-14 15:02:04.286044+00', 1, 4, 'SUMMER'),
	(31, '2025-10-14 15:02:04.286044+00', 1, 2, 'WINTER'),
	(32, '2025-10-14 15:02:04.286044+00', 1, 3, 'WINTER'),
	(33, '2025-10-14 15:02:04.286044+00', 1, 4, 'WINTER'),
	(34, '2025-10-14 15:02:04.286044+00', 1, 5, 'WINTER'),
	(35, '2025-10-14 15:02:04.286044+00', 1, 8, 'WINTER'),
	(36, '2025-10-14 15:02:04.286044+00', 1, 9, 'WINTER'),
	(37, '2025-10-14 15:02:04.286044+00', 1, 10, 'WINTER'),
	(38, '2025-10-14 15:02:04.286044+00', 1, 11, 'WINTER'),
	(39, '2025-10-14 15:02:04.286044+00', 1, 12, 'WINTER'),
	(40, '2025-10-14 15:02:04.286044+00', 1, 13, 'WINTER'),
	(41, '2025-10-14 15:02:04.286044+00', 1, 14, 'WINTER'),
	(42, '2025-10-14 15:02:04.286044+00', 1, 15, 'WINTER'),
	(43, '2025-10-14 15:02:04.286044+00', 1, 17, 'WINTER'),
	(44, '2025-10-14 15:02:04.286044+00', 1, 16, 'WINTER'),
	(45, '2025-10-14 15:02:04.286044+00', 1, 18, 'WINTER'),
	(46, '2025-10-14 15:02:04.286044+00', 1, 19, 'WINTER'),
	(47, '2025-10-14 15:02:04.286044+00', 1, 21, 'WINTER'),
	(48, '2025-10-14 15:02:04.286044+00', 1, 20, 'WINTER'),
	(49, '2025-10-14 15:02:04.286044+00', 1, 22, 'WINTER'),
	(50, '2025-10-14 15:02:04.286044+00', 1, 23, 'WINTER'),
	(51, '2025-10-14 15:02:04.286044+00', 1, 24, 'WINTER'),
	(52, '2025-10-14 15:02:04.286044+00', 1, 25, 'WINTER'),
	(53, '2025-10-14 15:02:04.286044+00', 1, 26, 'WINTER');


--
-- Data for Name: Blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Blocks" ("block_id", "created_at", "bleacher_id", "text", "date") VALUES
	(1, '2025-06-21 16:03:39.271912+00', 5, '', '2025-06-26'),
	(44, '2025-10-06 12:55:29.451242+00', 4, 'Test', '2025-08-06'),
	(39, '2025-10-02 19:04:04.891001+00', 2, 'agsjdfkhasdsj jda sk dkjhbd fjkhbd jkhsd jhdfs ', '2025-10-02'),
	(46, '2025-10-14 14:55:40.010324+00', 39, '38', '2025-10-14'),
	(6, '2025-06-27 14:43:04.548996+00', 5, '', '2025-06-28'),
	(47, '2025-10-15 13:38:08.383086+00', 2, 'test', '2025-10-15'),
	(8, '2025-07-04 18:15:18.104083+00', 3, '', '2025-07-03'),
	(45, '2025-10-14 14:55:02.518729+00', 38, 'hello from 38', '2025-10-14'),
	(48, '2025-10-16 17:25:08.214005+00', 2, 'hello there!!!', '2025-10-16'),
	(49, '2025-10-16 19:29:46.657019+00', 3, 'here too', '2025-10-16'),
	(50, '2025-10-16 20:05:08.189268+00', 3, 'hello', '2025-10-31'),
	(54, '2025-10-16 20:11:58.309834+00', 5, 'salute', '2025-10-30'),
	(55, '2025-10-16 20:41:08.971515+00', 2, 'hello', '2025-10-21'),
	(57, '2025-10-17 16:03:00.955854+00', 5, 'test', '2025-10-28'),
	(58, '2025-10-17 16:03:10.866921+00', 5, 'hello', '2025-10-29'),
	(59, '2025-10-17 16:03:33.367239+00', 8, 'hello', '2025-10-29'),
	(60, '2025-10-17 16:05:08.587618+00', 8, 'test', '2025-10-28'),
	(62, '2025-10-17 16:05:13.183067+00', 10, '', '2025-10-28'),
	(63, '2025-10-17 16:05:15.938096+00', 9, 'test', '2025-10-28'),
	(64, '2025-10-17 16:05:17.628413+00', 11, 'test', '2025-10-28'),
	(28, '2025-08-05 19:32:33.140438+00', 10, 'heello', '2025-07-09'),
	(29, '2025-08-08 19:53:50.22499+00', 8, 'hello', '2025-07-23'),
	(65, '2025-10-17 16:06:36.64834+00', 3, 'test', '2025-10-17'),
	(66, '2025-10-17 16:06:44.629015+00', 3, 'we''re testing now!', '2025-10-18'),
	(67, '2025-10-17 16:07:00.742983+00', 4, 'tu parle en francais?', '2025-10-18'),
	(69, '2025-10-17 16:20:34.632537+00', 8, 'hello', '2025-10-24'),
	(70, '2025-10-17 16:22:23.651039+00', 4, 'oh yeah', '2025-10-25'),
	(71, '2025-10-17 16:24:01.200583+00', 9, 'hi', '2025-10-29'),
	(38, '2025-09-30 20:14:04.124495+00', 3, 'hello', '2025-09-30'),
	(72, '2025-10-17 16:46:13.783882+00', 3, 'he', '2025-11-02'),
	(73, '2025-10-17 16:46:25.219267+00', 5, 'hi', '2025-11-02'),
	(75, '2025-10-31 16:00:28.702859+00', 3, 'these are some words', '2025-10-29');


--
-- Data for Name: Drivers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Drivers" ("driver_id", "created_at", "user_id", "tax", "pay_rate_cents", "pay_currency", "pay_per_unit") VALUES
	(3, '2025-08-05 20:15:16.939549+00', 24, 13, 0, 'CAD', 'KM'),
	(1, '2025-08-05 19:19:46.324395+00', 23, 13, 5066, 'CAD', 'MI'),
	(2, '2025-08-05 20:04:42.166119+00', 22, 13, 2832, 'CAD', 'HR'),
	(4, '2025-11-11 21:38:25.44868+00', 25, 0, 0, 'CAD', 'KM');


--
-- Data for Name: TaskStatuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."TaskStatuses" ("task_status_id", "created_at", "label", "hex") VALUES
	(1, '2025-06-25 19:58:53.605355+00', 'Backlog', '#e6e6e6'),
	(2, '2025-06-26 00:03:01.919047+00', 'Approved', '#e6e6e6'),
	(6, '2025-06-26 00:04:31.949746+00', 'Complete', '#86e87b'),
	(3, '2025-06-26 00:03:29.553141+00', 'In Progress', '#7b9ee8'),
	(4, '2025-06-26 00:03:53.563918+00', 'Paused', '#e87be3'),
	(5, '2025-06-26 00:04:08.352358+00', 'In Staging', '#7be8c0');


--
-- Data for Name: TaskTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."TaskTypes" ("task_type_id", "created_at", "label") VALUES
	(1, '2025-06-25 19:54:07.998867+00', 'Feature'),
	(2, '2025-06-25 19:54:18.31956+00', 'Bug');


--
-- Data for Name: Tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: UserHomeBases; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."UserHomeBases" ("user_home_base_id", "created_at", "user_id", "home_base_id") VALUES
	(8, '2025-05-27 17:39:31.364998+00', 11, 3),
	(10, '2025-05-27 18:23:29.146043+00', 13, 1),
	(11, '2025-05-27 21:32:03.360621+00', 9, 2),
	(12, '2025-05-27 21:32:03.360621+00', 9, 5),
	(20, '2025-06-18 18:17:57.372471+00', 12, 1),
	(21, '2025-06-18 18:17:57.372471+00', 12, 5),
	(22, '2025-06-18 18:17:57.372471+00', 12, 2),
	(23, '2025-06-18 18:17:57.372471+00', 12, 9),
	(24, '2025-06-18 18:17:57.372471+00', 12, 11);


--
-- Data for Name: UserRoles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."UserRoles" ("id", "created_at", "role") VALUES
	(1, '2025-05-21 16:30:21.98697+00', 'Account Manager'),
	(2, '2025-05-21 16:30:27.435782+00', 'Administrator'),
	(3, '2025-06-27 20:12:03.601198+00', 'Driver');


--
-- Data for Name: UserRolesJunction; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: UserStatuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."UserStatuses" ("id", "created_at", "status") VALUES
	(1, '2025-05-21 16:29:54.749727+00', 'Invited'),
	(2, '2025-05-21 16:30:01.377311+00', 'Active'),
	(3, '2025-05-21 16:30:07.124225+00', 'Inactive');


--
-- Data for Name: WorkTrackers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- NOTE: Sequence SET commands commented out for local development
-- These are not needed since sequences are auto-managed by GENERATED BY DEFAULT AS IDENTITY
--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--
-- SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);
--
-- Name: Addresses_address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."Addresses_address_id_seq"', 143, true);
--
-- Name: BleacherEvents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."BleacherEvents_id_seq"', 919, true);
--
-- Name: BleacherUsers_bleacher_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."BleacherUsers_bleacher_user_id_seq"', 53, true);
--
-- Name: Bleachers_bleacher_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."Bleachers_bleacher_id_seq"', 97, true);
--
-- Name: Blocks_block_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."Blocks_block_id_seq"', 75, true);
--
-- Name: Drivers_driver_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."Drivers_driver_id_seq"', 4, true);
--
-- Name: Events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."Events_id_seq"', 95, true);
--
-- Name: HomeBases_home_base_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."HomeBases_home_base_id_seq"', 14, true);
--
-- Name: TaskStatuses_task_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."TaskStatuses_task_status_id_seq"', 6, true);
--
-- Name: TaskTypes_task_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."TaskTypes_task_type_id_seq"', 2, true);
--
-- Name: Tasks_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."Tasks_task_id_seq"', 14, true);
--
-- Name: UserHomeBases_user_home_base_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."UserHomeBases_user_home_base_id_seq"', 24, true);
--
-- Name: UserRolesJunction_user_roles_junction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."UserRolesJunction_user_roles_junction_id_seq"', 1, false);
--
-- Name: UserRoles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."UserRoles_id_seq"', 3, true);
--
-- Name: UserStatuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."UserStatuses_id_seq"', 3, true);
--
-- Name: Users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."Users_user_id_seq"', 45, true);
--
-- Name: WorkTrackers_work_tracker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
-- SELECT pg_catalog.setval('"public"."WorkTrackers_work_tracker_id_seq"', 25, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;

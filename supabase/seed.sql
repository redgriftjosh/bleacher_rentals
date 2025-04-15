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
-- Data for Name: key; Type: TABLE DATA; Schema: pgsodium; Owner: supabase_admin
--



--
-- Data for Name: Addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Addresses" ("address_id", "created_at", "street", "city", "state_province", "zip_postal") VALUES
	(40, '2025-04-13 19:51:04.626693+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(41, '2025-04-13 19:52:37.854171+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(42, '2025-04-13 19:53:11.653843+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(43, '2025-04-13 19:53:59.545081+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(44, '2025-04-13 19:54:29.757799+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(45, '2025-04-13 19:54:55.770785+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(46, '2025-04-13 19:55:54.788445+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(47, '2025-04-13 19:58:37.953403+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(48, '2025-04-13 19:59:48.411151+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(49, '2025-04-13 20:05:12.691198+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(50, '2025-04-13 20:05:57.297462+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(51, '2025-04-13 20:06:52.339277+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(52, '2025-04-13 20:07:42.185564+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(53, '2025-04-13 20:20:19.411464+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(54, '2025-04-13 20:21:19.197908+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(55, '2025-04-13 20:22:00.443858+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(56, '2025-04-14 04:01:06.371493+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(57, '2025-04-14 04:01:55.129836+00', '12 Winding Way Crescent, London, ON, Canada', 'London', 'Ontario', 'N6G 3G1'),
	(58, '2025-04-14 04:03:14.699527+00', '12 Winding Way, Harwich Port, MA, USA', 'Harwich', 'Massachusetts', '02646'),
	(59, '2025-04-14 04:27:20.413049+00', 'Wołoska 12, Warsaw, Poland', 'Warszawa', 'Województwo mazowieckie', '02-675');


--
-- Data for Name: HomeBases; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."HomeBases" ("home_base_id", "created_at", "home_base_name") VALUES
	(1, '2025-04-04 22:53:36.51391+00', 'Florida'),
	(2, '2025-04-04 22:53:47.919592+00', 'Georgia'),
	(3, '2025-04-04 22:53:57.297282+00', 'Texas'),
	(4, '2025-04-04 22:54:05.531549+00', 'Oklahoma'),
	(5, '2025-04-04 22:54:16.118734+00', 'Ontario');


--
-- Data for Name: Bleachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Bleachers" ("bleacher_id", "created_at", "bleacher_number", "home_base_id", "winter_home_base_id", "bleacher_rows", "bleacher_seats", "created_by", "updated_at", "updated_by") VALUES
	(3, '2025-04-04 23:56:16.940118+00', 2, 3, 1, 10, 123, NULL, NULL, NULL),
	(6, '2025-04-05 00:10:22.649817+00', 5, 3, 5, 10, 432, NULL, NULL, NULL),
	(1, '2025-04-04 22:54:39.695532+00', 1, 3, 4, 10, 100, NULL, NULL, NULL),
	(4, '2025-04-04 23:57:22.443004+00', 3, 1, 2, 10, 123, NULL, NULL, NULL),
	(7, '2025-04-05 00:12:38.195909+00', 4, 4, 5, 7, 6, NULL, NULL, NULL),
	(8, '2025-04-12 02:01:13.868264+00', 7, 5, 4, 10, 200, NULL, NULL, NULL),
	(9, '2025-04-12 02:01:39.365569+00', 8, 5, 3, 10, 300, NULL, NULL, NULL),
	(10, '2025-04-12 02:02:15.448658+00', 9, 2, 2, 15, 400, NULL, NULL, NULL),
	(11, '2025-04-12 02:03:40.623413+00', 10, 2, 4, 15, 200, NULL, NULL, NULL),
	(12, '2025-04-12 02:04:06.431064+00', 11, 5, 3, 10, 200, NULL, NULL, NULL),
	(13, '2025-04-12 02:09:58.76428+00', 12, 1, 1, 7, 200, NULL, NULL, NULL),
	(5, '2025-04-05 00:03:28.882868+00', 6, 5, 2, 10, 123, NULL, NULL, NULL),
	(14, '2025-04-12 02:10:07.517118+00', 13, 1, 1, 7, 200, NULL, NULL, NULL),
	(15, '2025-04-12 02:10:18.740145+00', 14, 1, 1, 7, 200, NULL, NULL, NULL),
	(16, '2025-04-12 02:10:33.122234+00', 15, 1, 1, 7, 200, NULL, NULL, NULL),
	(17, '2025-04-12 02:10:44.973334+00', 16, 3, 2, 7, 200, NULL, NULL, NULL),
	(18, '2025-04-12 02:10:57.874286+00', 17, 3, 5, 10, 200, NULL, NULL, NULL),
	(19, '2025-04-12 02:11:42.68076+00', 18, 1, 1, 7, 200, NULL, NULL, NULL),
	(20, '2025-04-12 02:11:52.883279+00', 19, 2, 5, 7, 200, NULL, NULL, NULL),
	(21, '2025-04-12 02:12:06.982957+00', 20, 5, 2, 10, 200, NULL, NULL, NULL),
	(22, '2025-04-12 02:12:22.417517+00', 21, 3, 5, 10, 200, NULL, NULL, NULL),
	(23, '2025-04-12 02:12:47.979571+00', 22, 2, 5, 15, 200, NULL, NULL, NULL);


--
-- Data for Name: Events; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Events" ("event_id", "created_at", "event_name", "setup_start", "event_start", "event_end", "teardown_end", "address_id", "total_seats", "seven_row", "ten_row", "fifteen_row", "lenient", "booked", "notes", "must_be_clean", "hsl_hue") VALUES
	(36, '2025-04-13 19:51:04.7883+00', 'Test Event 1', NULL, '2025-04-14', '2025-04-15', NULL, 40, 1, 0, 0, 0, true, true, '', false, NULL),
	(37, '2025-04-13 19:52:37.923911+00', 'Test 2', NULL, '2025-04-14', '2025-04-16', NULL, 41, 0, 1, 0, 0, false, true, '', false, 357),
	(41, '2025-04-13 19:54:55.841834+00', 'Test 6', NULL, '2025-04-14', '2025-04-17', NULL, 45, 0, 1, 0, 0, false, true, '', false, 132),
	(42, '2025-04-13 19:55:54.875579+00', 'Test 7', NULL, '2025-04-14', '2025-04-18', NULL, 46, 0, 1, 0, 0, false, true, '', false, 222),
	(44, '2025-04-13 19:59:48.505363+00', 'Test 9', NULL, '2025-04-08', '2025-04-30', NULL, 48, 0, 1, 0, 0, false, true, '', false, 312),
	(45, '2025-04-13 20:05:12.794212+00', 'Test 10', NULL, '2025-04-14', '2025-04-18', NULL, 49, 1, 0, 0, 0, true, true, '', false, 42),
	(46, '2025-04-13 20:05:57.387284+00', 'Test 11', NULL, '2025-04-10', '2025-04-18', NULL, 50, 0, 1, 0, 0, false, true, '', false, 65),
	(47, '2025-04-13 20:06:52.51009+00', 'Test 12', NULL, '2025-04-15', '2025-04-18', NULL, 51, 1, 0, 0, 0, true, true, '', false, 110),
	(48, '2025-04-13 20:07:42.263606+00', 'Test 13', NULL, '2025-04-10', '2025-04-18', NULL, 52, 0, 1, 0, 0, false, false, '', false, 155),
	(50, '2025-04-13 20:21:19.291881+00', 'Test 14', NULL, '2025-06-01', '2025-06-07', NULL, 54, 0, 1, 0, 0, false, true, '', false, 245),
	(51, '2025-04-13 20:22:00.540335+00', 'Test 16', NULL, '2025-06-01', '2025-06-07', NULL, 55, 0, 1, 0, 0, false, true, '', false, 290),
	(49, '2025-04-13 20:20:19.496821+00', 'Test Event 8', NULL, '2025-01-01', '2025-07-31', NULL, 53, 1, 0, 0, 0, true, false, '', false, 200),
	(38, '2025-04-13 19:53:11.784256+00', 'Test 3', NULL, '2025-04-15', '2025-04-17', NULL, 42, 0, 1, 0, 0, false, false, '', false, 177),
	(40, '2025-04-13 19:54:29.852435+00', 'test 5', '2025-03-10', '2025-04-14', '2025-04-17', '2025-04-20', 44, 0, 1, 0, 0, false, true, '', false, 54),
	(52, '2025-04-14 04:01:06.546317+00', 'Liv Test', '2025-04-23', '2025-04-25', '2025-04-28', '2025-05-02', 56, 0, 1, 0, 0, false, true, 'hi', false, 88),
	(53, '2025-04-14 04:01:55.212002+00', 'Liv', '2025-04-22', '2025-04-25', '2025-04-28', '2025-05-02', 57, 0, 1, 0, 0, false, true, 'helo', false, 335),
	(54, '2025-04-14 04:03:14.788046+00', 'he', NULL, '2025-04-22', '2025-04-30', '2025-05-02', 58, 0, 1, 0, 0, false, true, '', false, 20),
	(55, '2025-04-14 04:27:20.496895+00', 'asdfghjkl', '2025-04-12', '2025-04-15', '2025-04-20', NULL, 59, 0, 1, 0, 0, false, true, '', false, 268);


--
-- Data for Name: BleacherEvents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."BleacherEvents" ("bleacher_event_id", "created_at", "bleacher_id", "event_id") VALUES
	(45, '2025-04-13 19:51:04.949801+00', 23, 36),
	(46, '2025-04-13 19:52:38.012757+00', 22, 37),
	(47, '2025-04-13 19:53:11.921114+00', 21, 38),
	(49, '2025-04-13 19:54:29.989283+00', 19, 40),
	(50, '2025-04-13 19:54:55.954055+00', 18, 41),
	(51, '2025-04-13 19:55:54.95664+00', 17, 42),
	(53, '2025-04-13 19:59:48.586278+00', 15, 44),
	(54, '2025-04-13 20:05:12.884814+00', 14, 45),
	(55, '2025-04-13 20:05:57.469332+00', 13, 46),
	(56, '2025-04-13 20:06:52.576818+00', 12, 47),
	(57, '2025-04-13 20:07:42.355714+00', 11, 48),
	(58, '2025-04-13 20:20:19.583424+00', 16, 49),
	(59, '2025-04-13 20:22:00.635447+00', 15, 51),
	(60, '2025-04-14 04:01:55.322099+00', 23, 53),
	(61, '2025-04-14 04:03:14.872822+00', 22, 54),
	(62, '2025-04-14 04:03:14.872822+00', 20, 54),
	(63, '2025-04-14 04:03:14.872822+00', 13, 54),
	(64, '2025-04-14 04:03:14.872822+00', 17, 54),
	(65, '2025-04-14 04:03:14.872822+00', 18, 54),
	(66, '2025-04-14 04:03:14.872822+00', 11, 54),
	(67, '2025-04-14 04:27:20.612309+00', 20, 55);


--
-- Data for Name: InvitedUsers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."InvitedUsers" ("invited_user_id", "created_at", "email") VALUES
	(1, '2025-04-07 03:23:05.644939+00', 'allanjosh12@gmail.com'),
	(2, '2025-04-07 17:32:39.990247+00', 'redgriftjosh+6@gmail.com'),
	(3, '2025-04-07 17:33:19.414564+00', 'redgriftjosh+7@gmail.com');


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."Users" ("user_id", "created_at", "first_name", "last_name", "email", "phone", "clerk_user_id") VALUES
	(14, '2025-04-07 02:15:43.774767+00', 'Example', 'Example', 'example@example.org', NULL, 'user_29w83sxmDNGwOuEthce5gg56FcC'),
	(15, '2025-04-07 03:11:52.097944+00', 'Josh', 'Redgrift', 'redgriftjosh@gmail.com', NULL, 'user_2vNpiLsOu0hws5YG5ypnOfhTRqW');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: key_key_id_seq; Type: SEQUENCE SET; Schema: pgsodium; Owner: supabase_admin
--

SELECT pg_catalog.setval('"pgsodium"."key_key_id_seq"', 1, false);


--
-- Name: Addresses_address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."Addresses_address_id_seq"', 59, true);


--
-- Name: BleacherEvents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."BleacherEvents_id_seq"', 67, true);


--
-- Name: Bleachers_bleacher_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."Bleachers_bleacher_id_seq"', 23, true);


--
-- Name: Events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."Events_id_seq"', 55, true);


--
-- Name: HomeBases_home_base_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."HomeBases_home_base_id_seq"', 5, true);


--
-- Name: InvitedUsers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."InvitedUsers_id_seq"', 3, true);


--
-- Name: Users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."Users_user_id_seq"', 15, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;

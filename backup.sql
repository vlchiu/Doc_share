--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Plan; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Plan" AS ENUM (
    'FREE',
    'VIP'
);


ALTER TYPE public."Plan" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: Status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."Status" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public."Category" OWNER TO postgres;

--
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Category_id_seq" OWNER TO postgres;

--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Comment" (
    id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer NOT NULL,
    document_id integer NOT NULL
);


ALTER TABLE public."Comment" OWNER TO postgres;

--
-- Name: Comment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Comment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Comment_id_seq" OWNER TO postgres;

--
-- Name: Comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Comment_id_seq" OWNED BY public."Comment".id;


--
-- Name: Document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Document" (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_type text NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    download_count integer DEFAULT 0 NOT NULL,
    status public."Status" DEFAULT 'PENDING'::public."Status" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer NOT NULL,
    category_id integer NOT NULL,
    doc_type text DEFAULT 'Chung'::text NOT NULL,
    reject_reason text,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public."Document" OWNER TO postgres;

--
-- Name: Document_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Document_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Document_id_seq" OWNER TO postgres;

--
-- Name: Document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Document_id_seq" OWNED BY public."Document".id;


--
-- Name: DownloadHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DownloadHistory" (
    id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer NOT NULL,
    document_id integer NOT NULL
);


ALTER TABLE public."DownloadHistory" OWNER TO postgres;

--
-- Name: DownloadHistory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."DownloadHistory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DownloadHistory_id_seq" OWNER TO postgres;

--
-- Name: DownloadHistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."DownloadHistory_id_seq" OWNED BY public."DownloadHistory".id;


--
-- Name: Follow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Follow" (
    follower_id integer NOT NULL,
    following_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Follow" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id integer NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer NOT NULL,
    link text
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Notification_id_seq" OWNER TO postgres;

--
-- Name: Notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Notification_id_seq" OWNED BY public."Notification".id;


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id integer NOT NULL,
    order_id text NOT NULL,
    amount integer NOT NULL,
    plan_months integer NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    provider text NOT NULL,
    provider_ref text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: Payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Payment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Payment_id_seq" OWNER TO postgres;

--
-- Name: Payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Payment_id_seq" OWNED BY public."Payment".id;


--
-- Name: Rating; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Rating" (
    user_id integer NOT NULL,
    document_id integer NOT NULL,
    score integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Rating" OWNER TO postgres;

--
-- Name: Report; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Report" (
    id integer NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer NOT NULL,
    document_id integer NOT NULL,
    action text,
    admin_note text
);


ALTER TABLE public."Report" OWNER TO postgres;

--
-- Name: Report_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Report_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Report_id_seq" OWNER TO postgres;

--
-- Name: Report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Report_id_seq" OWNED BY public."Report".id;


--
-- Name: SavedDocument; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SavedDocument" (
    user_id integer NOT NULL,
    document_id integer NOT NULL,
    saved_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SavedDocument" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text,
    avatar_url text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    google_id text,
    download_reset_at timestamp(3) without time zone,
    email_verify_expires timestamp(3) without time zone,
    email_verify_token text,
    is_email_verified boolean DEFAULT false NOT NULL,
    monthly_downloads integer DEFAULT 0 NOT NULL,
    plan public."Plan" DEFAULT 'FREE'::public."Plan" NOT NULL,
    plan_expires_at timestamp(3) without time zone,
    reset_token text,
    reset_token_expires timestamp(3) without time zone
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: Comment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment" ALTER COLUMN id SET DEFAULT nextval('public."Comment_id_seq"'::regclass);


--
-- Name: Document id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document" ALTER COLUMN id SET DEFAULT nextval('public."Document_id_seq"'::regclass);


--
-- Name: DownloadHistory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DownloadHistory" ALTER COLUMN id SET DEFAULT nextval('public."DownloadHistory_id_seq"'::regclass);


--
-- Name: Notification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification" ALTER COLUMN id SET DEFAULT nextval('public."Notification_id_seq"'::regclass);


--
-- Name: Payment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN id SET DEFAULT nextval('public."Payment_id_seq"'::regclass);


--
-- Name: Report id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report" ALTER COLUMN id SET DEFAULT nextval('public."Report_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name, description) FROM stdin;
1	Toán học	Tài liệu môn Toán
2	Lập trình	Tài liệu Công nghệ thông tin
3	Ngoại ngữ	Tài liệu Tiếng Anh, Nhật, Hàn...
4	Tổng hợp	Các tài liệu khác
\.


--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Comment" (id, content, created_at, user_id, document_id) FROM stdin;
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Document" (id, title, description, file_url, file_type, view_count, download_count, status, created_at, user_id, category_id, doc_type, reject_reason, deleted_at) FROM stdin;
10	Hsptek_Bsp_yep	Ảnh yep	/uploads/1778085745013-ABC06331.jpg	image/jpeg	0	2	APPROVED	2026-05-06 16:42:25.123	3	4	Chung	\N	\N
9	hello	C/C++	/uploads/1778085697830-hello.cpp	text/plain	0	1	APPROVED	2026-05-06 16:41:37.86	3	2	Hardware	\N	\N
1	3268-QD vv cu sinh vien di thuc tap K.CNTT - HP Thuc tap he thong thong tin quan ly_0001	Hệ thống thông tin quản lý	/uploads/1776764301694-3268-QD vv cu sinh vien di thuc tap K.CNTT - HP Thuc tap he thong thong tin quan ly_0001.pdf	application/pdf	0	0	APPROVED	2026-04-21 09:38:21.744	1	4	Chung	\N	\N
8	bao_cao_thuc_tap_hsptek	Thông báo	/uploads/1776771541278-bao_cao_thuc_tap_hsptek.pdf	application/pdf	5	1	APPROVED	2026-04-21 11:39:01.283	2	1	Thông báo	\N	\N
7	bài ktra gk kiểm thử 1	Kiểm tra	/uploads/1776771525327-bÃ i ktra gk kiá»m thá»­ 1.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	4	1	APPROVED	2026-04-21 11:38:45.331	2	1	Software	\N	\N
6	_031021000817.297A6520	image	/uploads/1776771508022-_031021000817.297A6520.jpg	image/jpeg	1	1	APPROVED	2026-04-21 11:38:28.049	2	1	Chung	\N	\N
5	1.Introduction2PostgreSQL_Installation	PostgreSQL	/uploads/1776771474258-1.Introduction2PostgreSQL_Installation.pdf	application/pdf	1	1	APPROVED	2026-04-21 11:37:54.292	2	1	Hardware	\N	\N
4	Randomized fast no-loss expert system to play tic tac toe like a human	Tài liệu tic tac toe	/uploads/1776771408423-Randomized fast no-loss expert system to play tic tac toe like a human.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	0	1	APPROVED	2026-04-21 11:36:48.453	1	1	Software	\N	\N
3	3267-QD vv cu sinh vien di thuc tap K.CNTT - HP Thuc tap he thong thong tin tich hop_0001	Thực tập hệ thống thông tin tích hợp	/uploads/1776764381850-3267-QD vv cu sinh vien di thuc tap K.CNTT - HP Thuc tap he thong thong tin tich hop_0001.pdf	application/pdf	2	1	APPROVED	2026-04-21 09:39:41.906	1	3	Software	\N	\N
2	3266-QD vv cu sinh vien di thuc tap K.CNTT - HP Thuc tap quan tri du an phan mem_0001	Quản trị dự án phần mềm	/uploads/1776764349806-3266-QD vv cu sinh vien di thuc tap K.CNTT - HP Thuc tap quan tri du an phan mem_0001.pdf	application/pdf	0	1	APPROVED	2026-04-21 09:39:09.86	1	2	Hardware	\N	\N
\.


--
-- Data for Name: DownloadHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DownloadHistory" (id, created_at, user_id, document_id) FROM stdin;
1	2026-05-07 17:05:57.946	5	10
2	2026-05-08 04:41:55.399	5	10
3	2026-05-08 04:41:58.348	5	9
4	2026-05-08 04:42:00.556	5	8
5	2026-05-08 04:42:04.192	5	7
6	2026-05-08 04:42:06.797	5	6
7	2026-05-08 04:42:09.086	5	5
8	2026-05-08 04:42:12.156	5	4
9	2026-05-08 04:42:14.415	5	3
10	2026-05-08 04:42:19.904	5	2
\.


--
-- Data for Name: Follow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Follow" (follower_id, following_id, created_at) FROM stdin;
1	3	2026-05-06 16:43:04.535
1	2	2026-05-06 16:43:10.009
2	1	2026-05-06 16:43:24.314
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, content, is_read, created_at, user_id, link) FROM stdin;
4	👤 Hoainam đã bắt đầu theo dõi bạn	t	2026-05-06 16:43:10.016	2	/users/1
5	👤 Hoài đã bắt đầu theo dõi bạn	f	2026-05-06 16:43:24.32	1	/users/2
1	✅ Tài liệu "Hsptek_Bsp_yep" của bạn đã được duyệt!	t	2026-05-06 16:42:47.52	3	/documents/10
2	✅ Tài liệu "hello" của bạn đã được duyệt!	t	2026-05-06 16:42:48.202	3	/documents/9
3	👤 Hoainam đã bắt đầu theo dõi bạn	t	2026-05-06 16:43:04.542	3	/users/1
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, order_id, amount, plan_months, status, provider, provider_ref, created_at, updated_at, user_id) FROM stdin;
1	DOCSHARE_4_1778167731126	29000	1	PENDING	MOMO	\N	2026-05-07 15:28:51.151	2026-05-07 15:28:51.151	4
2	DS41778167737016	79000	3	PENDING	VNPAY	\N	2026-05-07 15:28:57.023	2026-05-07 15:28:57.023	4
3	DS41778167750438	29000	1	PENDING	VNPAY	\N	2026-05-07 15:29:10.441	2026-05-07 15:29:10.441	4
4	DS41778168804576	79000	3	PENDING	VNPAY	\N	2026-05-07 15:46:44.582	2026-05-07 15:46:44.582	4
5	DOCSHARE_4_1778168820765	79000	3	PENDING	MOMO	\N	2026-05-07 15:47:00.768	2026-05-07 15:47:00.768	4
6	DS41778168823457	79000	3	PENDING	VNPAY	\N	2026-05-07 15:47:03.458	2026-05-07 15:47:03.458	4
7	DOCSHARE_5_1778170493563	29000	1	PENDING	MOMO	\N	2026-05-07 16:14:53.575	2026-05-07 16:14:53.575	5
8	DS51778170496339	79000	3	PENDING	VNPAY	\N	2026-05-07 16:14:56.344	2026-05-07 16:14:56.344	5
9	DS51778172065849	79000	3	PENDING	VNPAY	\N	2026-05-07 16:41:05.859	2026-05-07 16:41:05.859	5
10	DS51778172281531	79000	3	PENDING	VNPAY	\N	2026-05-07 16:44:41.55	2026-05-07 16:44:41.55	5
11	DS51778172383113	79000	3	PENDING	VNPAY	\N	2026-05-07 16:46:23.137	2026-05-07 16:46:23.137	5
12	DS51778172405409	79000	3	PENDING	VNPAY	\N	2026-05-07 16:46:45.41	2026-05-07 16:46:45.41	5
13	DS51778172519034	79000	3	PENDING	VNPAY	\N	2026-05-07 16:48:39.042	2026-05-07 16:48:39.042	5
14	DS51778172573099	79000	3	PENDING	VNPAY	\N	2026-05-07 16:49:33.119	2026-05-07 16:49:33.119	5
15	DS51778172703923	79000	3	FAILED	VNPAY	\N	2026-05-07 16:51:43.945	2026-05-07 16:51:49.101	5
16	DS51778173203214	79000	3	FAILED	VNPAY	\N	2026-05-07 17:00:03.216	2026-05-07 17:05:34.033	5
\.


--
-- Data for Name: Rating; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Rating" (user_id, document_id, score, created_at) FROM stdin;
\.


--
-- Data for Name: Report; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Report" (id, reason, status, created_at, user_id, document_id, action, admin_note) FROM stdin;
\.


--
-- Data for Name: SavedDocument; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SavedDocument" (user_id, document_id, saved_at) FROM stdin;
1	7	2026-04-21 11:40:34.076
1	6	2026-04-21 11:40:34.71
1	3	2026-04-21 11:40:36.538
1	5	2026-04-21 11:40:37.782
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, email, password, avatar_url, role, created_at, is_active, google_id, download_reset_at, email_verify_expires, email_verify_token, is_email_verified, monthly_downloads, plan, plan_expires_at, reset_token, reset_token_expires) FROM stdin;
2	Hoài	hoainam12@gmail.com	$2b$10$wM2QsSKDxCylhW71SWGlDusC7st.z34o/qP9Yi0gphyukAj3snyZG	\N	USER	2026-04-21 11:37:03.97	t	\N	\N	\N	\N	f	0	FREE	\N	\N	\N
3	Nam Trịnh	trinhhoainam0601@gmail.com		https://lh3.googleusercontent.com/a/ACg8ocKp3O6ZbkG5sAhXi23ARh9NlgpKOwSPMGt_T6MklFsnixu_fyI=s96-c	USER	2026-05-06 16:40:51.058	t	104383941810736187130	\N	\N	\N	f	0	FREE	\N	\N	\N
6	dsdser	hoainams1@gmail.com	$2b$10$bJi5XNT0CHmZQuwE0hrXF.7pgHLWWN5a1mEseMyvPlmUf2XlP7KkS	\N	USER	2026-05-07 15:51:09.563	t	\N	\N	2026-05-08 15:51:09.562	c4f1498683e8a594e50a164f1fe59c154b8e52856e6e5026f3a8f12d1c08c647	f	0	FREE	\N	\N	\N
1	Hoainam	hoainam1@gmail.com	$2b$10$zS8BQ0aiEhrQn7YFx/urqu8uFC7fYi6pvFtznqMfIZaZEK67qmF4C	\N	ADMIN	2026-04-20 18:07:12.08	t	\N	\N	2026-05-08 16:00:53.449	59c7b35085182af8edd51fa456f6ed3ed3d77531071ca057aa86886e2e87c88b	f	0	FREE	\N	\N	\N
4	Trịnh Nam	namduc06012004@gmail.com		https://lh3.googleusercontent.com/a/ACg8ocLEHIGGjOXJnItXUu_ht2Kh60k7txXUC1fnbfo_WHUujECg9A=s96-c	ADMIN	2026-05-07 15:00:44.075	t	107420194942405937944	\N	\N	\N	f	0	FREE	\N	\N	\N
5	Ly	nam06012004@gmail.com	$2b$10$G74gVte3talKWqsQDDu2MeNkCRWa8S5Y62ZAamJLX.msCzoM8SYDG	\N	USER	2026-05-07 15:50:58.894	t	\N	2026-05-07 17:05:57.911	\N	\N	t	10	FREE	\N	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
f9438dfc-3c34-4199-a5db-ab439b1f985e	fc4a0edc9883ed958f805e766db6f8f0e4edfe32e1771cdff1c16bc4ba5da84c	2026-04-21 01:03:14.455896+07	20260410085213_init_database	\N	\N	2026-04-21 01:03:14.41136+07	1
7e34057a-056f-40dd-9f48-77e9e1f51d93	d8436274a3d84626c8f9a958e64ff7a9126bffb2c31d05c148cea01201fe526c	2026-05-06 23:11:58.706756+07	20260505070724_add_google_id	\N	\N	2026-05-06 23:11:58.702931+07	1
30fa0235-0093-4e4d-b3b9-2f57143bcfe6	660a3f7922eb6d025d4d7f34c585e876c01e2cbe25f515170ba5184d42aff470	2026-04-21 01:03:14.459647+07	20260415100946_add_doc_type	\N	\N	2026-04-21 01:03:14.456462+07	1
02695599-872b-4a49-bb45-8459b6e17438	31b2a2389087725ac7f9cff859659753422f0f3f5bf6a14545ee3b6771a868b5	2026-04-21 01:03:14.461643+07	20260418050800_add_user_is_active	\N	\N	2026-04-21 01:03:14.459908+07	1
8df92a98-3e06-4eaf-840f-973d8f081de5	ba460f9dbdf8f2724dc455a7d3df479fd35e197b37fd730bf07b6c35321cae24	2026-05-06 23:11:58.597214+07	20260423082446_add_reject_reason	\N	\N	2026-05-06 23:11:58.577874+07	1
6a17ce76-8923-475a-819e-c0381c66fbea	122d743a0403e77ad7e0ed9447f5b8826f2fbdbc55612d936eff004dd13c2eec	2026-05-06 23:11:58.70937+07	20260505070739_add_google_id	\N	\N	2026-05-06 23:11:58.707393+07	1
3e7b598f-8ee4-43db-9289-1f845f706a12	219ae0030f1838908a6549f7c695ae81a8911daf27f1c6f9dff7450be51dbd60	2026-05-06 23:11:58.601594+07	20260423082548_add_rejected_status	\N	\N	2026-05-06 23:11:58.598023+07	1
0edc3d86-cc0d-46e6-86a9-1fac19df74b4	618960cc0a71fd2e446f00c228c272be44015cb5dc0eec921cdb6a341d8e4dba	2026-05-06 23:11:58.65727+07	20260423083946_add_notifications	\N	\N	2026-05-06 23:11:58.602393+07	1
851586b8-168e-4053-9015-a70a89dcfac6	879bf36dc385fef93ae6dda153372f9c46a8b7e194b27dc94c439827fa74be75	2026-05-06 23:11:58.660383+07	20260423093214_add_soft_delete	\N	\N	2026-05-06 23:11:58.658077+07	1
335fcd03-d1fb-4c4a-b685-8c7d90070894	9cb51e0b7636fa960d2bd9f801893d4151f9fbecb6d7514cfd9cd8926b70ca3d	2026-05-06 23:11:59.568835+07	20260506161159_add_google_oauth_and_missing_tables	\N	\N	2026-05-06 23:11:59.565389+07	1
2ce28224-05cc-4a70-af59-dfad9e9ecc47	a57964ae6a50d2e312a177d3e6335574c2eec354abfb36b013ad30626ce53f86	2026-05-06 23:11:58.663356+07	20260423093539_add_notification_link	\N	\N	2026-05-06 23:11:58.660823+07	1
f55c1e75-e0cb-40de-bd68-082a1bb84b15	967dc576641deddcb2751bd357f7b4cd0435c9f258b9fa8864df3134490f2b0d	2026-05-06 23:11:58.672097+07	20260424024714_add_rating	\N	\N	2026-05-06 23:11:58.663893+07	1
50df4443-9fb5-4022-9590-4bad5a25b30d	27ba96f5adf4078e2a7fdcb53c45f8d5a48106231997c05b48269015b75ecaee	2026-05-06 23:11:58.683767+07	20260424025231_add_report	\N	\N	2026-05-06 23:11:58.672929+07	1
f2b6cf19-c86b-4313-8426-abb16d17a168	dc671fb39ae71f4605e4df22e39e7f7d3239ca5f72c7e845c043d5f4db980673	2026-05-07 22:15:39.751017+07	20260507151539_add_email_verify_vip_payment	\N	\N	2026-05-07 22:15:39.641559+07	1
82eaeb5a-0549-4d5d-bdee-00a335379014	7aa94429f058e54c7c2fc9360376ded6a8f0bd18a57c30d06a65ed25379c6c63	2026-05-06 23:11:58.692318+07	20260424034640_add_download_history	\N	\N	2026-05-06 23:11:58.684462+07	1
9224d6d9-99f2-4b73-ad8e-50b63fd808d9	eb7e0d3cf40729765e13c512cdb12d949327ef618d6225de88285ad8cc2f278e	2026-05-06 23:11:58.698726+07	20260424035232_add_follow	\N	\N	2026-05-06 23:11:58.693057+07	1
97bd5530-d315-47af-af28-39068905eab4	4d4c8d6be5ae9f4c6d51488b1ca718ae56ed9812a40a8119b8b234f46834cd47	2026-05-06 23:11:58.702324+07	20260424042227_add_report_action	\N	\N	2026-05-06 23:11:58.69948+07	1
\.


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Category_id_seq"', 4, true);


--
-- Name: Comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Comment_id_seq"', 1, false);


--
-- Name: Document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Document_id_seq"', 10, true);


--
-- Name: DownloadHistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DownloadHistory_id_seq"', 10, true);


--
-- Name: Notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Notification_id_seq"', 5, true);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 16, true);


--
-- Name: Report_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Report_id_seq"', 1, false);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 6, true);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: DownloadHistory DownloadHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DownloadHistory"
    ADD CONSTRAINT "DownloadHistory_pkey" PRIMARY KEY (id);


--
-- Name: Follow Follow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_pkey" PRIMARY KEY (follower_id, following_id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Rating Rating_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rating"
    ADD CONSTRAINT "Rating_pkey" PRIMARY KEY (user_id, document_id);


--
-- Name: Report Report_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY (id);


--
-- Name: SavedDocument SavedDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SavedDocument"
    ADD CONSTRAINT "SavedDocument_pkey" PRIMARY KEY (user_id, document_id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Payment_order_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Payment_order_id_key" ON public."Payment" USING btree (order_id);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_google_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_google_id_key" ON public."User" USING btree (google_id);


--
-- Name: Comment Comment_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DownloadHistory DownloadHistory_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DownloadHistory"
    ADD CONSTRAINT "DownloadHistory_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DownloadHistory DownloadHistory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DownloadHistory"
    ADD CONSTRAINT "DownloadHistory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Follow Follow_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_follower_id_fkey" FOREIGN KEY (follower_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Follow Follow_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_following_id_fkey" FOREIGN KEY (following_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rating Rating_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rating"
    ADD CONSTRAINT "Rating_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rating Rating_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rating"
    ADD CONSTRAINT "Rating_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Report Report_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Report Report_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SavedDocument SavedDocument_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SavedDocument"
    ADD CONSTRAINT "SavedDocument_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SavedDocument SavedDocument_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SavedDocument"
    ADD CONSTRAINT "SavedDocument_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


CREATE TABLE "prediction_hourly" (
	"route_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"direction_id" integer NOT NULL,
	"hour_start" timestamp with time zone NOT NULL,
	"n_total" integer NOT NULL,
	"n_delay" integer NOT NULL,
	"sum_delay_sec" bigint NOT NULL,
	"n_ontime" integer NOT NULL,
	CONSTRAINT "prediction_hourly_route_id_stop_id_direction_id_hour_start_pk" PRIMARY KEY("route_id","stop_id","direction_id","hour_start")
);

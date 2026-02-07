from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Bird Tarifa API"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/bird_tarifa"
    cors_origins: str = "*"
    aws_region: str = "eu-west-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket_name: str = ""
    s3_public_base_url: str = ""
    max_upload_mb: int = 8

    # Optional external predictions (eBird). Leave EBIRD_API_KEY empty to disable.
    ebird_api_key: str = ""
    ebird_geo_lat: float = 36.0139
    ebird_geo_lng: float = -5.6069
    ebird_geo_dist_km: int = 25
    ebird_geo_back_days: int = 30
    ebird_spp_locale: str = "es"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

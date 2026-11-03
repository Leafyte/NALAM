from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, BaseModel, Field, field_validator, model_validator

from ..languages import LANGUAGES


def _check_language(v: str) -> str:
    if v not in LANGUAGES:
        raise ValueError(f"unsupported language, use one of {sorted(LANGUAGES)}")
    return v


Language = Annotated[str, AfterValidator(_check_language)]
InputMode = Literal["text", "voice"]


class SessionCreate(BaseModel):
    language: Language
    consent: bool = Field(description="Patient must explicitly consent before any data is stored")


class QuestionOut(BaseModel):
    id: str
    text: str
    hint: Optional[str] = None
    kind: Literal["text", "severity"]
    stage: Literal["core", "followup"]
    required: bool
    position: int
    total: int


class UrgentNotice(BaseModel):
    message: str
    matched: list


class AnswerIn(BaseModel):
    question_id: str
    text: str = Field(default="", max_length=2000)
    input_mode: InputMode = "text"
    language: Optional[Language] = None
    transcript_confidence: Optional[float] = Field(default=None, ge=0, le=1)
    translated_text: Optional[str] = Field(default=None, max_length=4000)
    skipped: bool = False

    @field_validator("text")
    @classmethod
    def strip(cls, v):
        return v.strip()

    @model_validator(mode="after")
    def need_text_unless_skipped(self):
        if not self.skipped and not self.text:
            raise ValueError("text must not be empty unless skipped is true")
        return self


class AnswerOut(BaseModel):
    question_id: str
    text: str
    original_text: str
    translated_text: Optional[str] = None
    translation_status: Literal["not_needed", "ok", "mock", "unavailable"]
    edited: bool
    urgent_notice: Optional[UrgentNotice] = None
    next_question: Optional[QuestionOut] = None
    complete: bool


class SessionOut(BaseModel):
    session_id: str
    language: Language
    next_question: Optional[QuestionOut]


class AnswerItem(BaseModel):
    question: QuestionOut
    text: Optional[str]
    original_text: Optional[str]
    translated_text: Optional[str]
    input_mode: Optional[str]
    transcript_confidence: Optional[float]
    edited: bool
    skipped: bool
    answered: bool


class SessionState(BaseModel):
    session_id: str
    language: Language
    status: str
    items: list
    next_question: Optional[QuestionOut]


class SubmitIn(BaseModel):
    confirmed: bool


class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    source: Language
    target: Language


class SummaryCorrection(BaseModel):
    main_concern: str = Field(max_length=2000)
    reported_symptoms: list[str] = Field(default_factory=list)
    onset: str = Field(max_length=1000)
    duration: str = Field(max_length=1000)
    severity: str = Field(max_length=200)
    additional_info: str = Field(max_length=4000)
    clinician_notes: str = Field(default="", max_length=4000)

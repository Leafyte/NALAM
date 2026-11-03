from fastapi import HTTPException


def api_error(status: int, code: str, message: str) -> HTTPException:
    """All domain errors look like {"detail": {"code": ..., "message": ...}}."""
    return HTTPException(status_code=status, detail={"code": code, "message": message})
